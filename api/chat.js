import { searchRecords } from "../lib/db.js";

// ---- Settings (all come from environment variables, see .env.example) ------
const API_KEY = process.env.LLM_API_KEY; // your key: set in .env locally, or in Vercel
const BASE_URL = (process.env.LLM_BASE_URL || "https://openrouter.ai/api/v1").replace(/\/$/, "");
const MODEL = process.env.LLM_MODEL || "openai/gpt-oss-120b";
const ALLOWED = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
// -----------------------------------------------------------------------------

const MAX_HISTORY = 10;
const MAX_CHARS = 2000;
const MAX_TOOL_ROUNDS = 4;

const SYSTEM =
  process.env.SYSTEM_PROMPT ||
  `You are the assistant on our website. Answer visitors' questions using only what the search_database tool returns.
If the tool returns nothing relevant, say you couldn't find that and suggest contacting the team.
Keep answers short, friendly and in plain language. Reply in the language the visitor uses.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "search_database",
      description: "Search our database for information relevant to the visitor's question. Returns up to 5 records.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Short keyword query" } },
        required: ["query"],
      },
    },
  },
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED.includes("*")) res.setHeader("Access-Control-Allow-Origin", "*");
  else if (origin && ALLOWED.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function cleanMessages(input) {
  if (!Array.isArray(input)) return null;
  const msgs = input
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_HISTORY);
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs.length && msgs[msgs.length - 1].role === "user" ? msgs : null;
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });

  const origin = req.headers.origin;
  if (!ALLOWED.includes("*") && origin && !ALLOWED.includes(origin)) {
    return res.status(403).json({ error: "Origin not allowed" });
  }
  if (!API_KEY) {
    console.error("LLM_API_KEY is not set");
    return res.status(500).json({ error: "The assistant is not configured yet." });
  }

  const history = cleanMessages(req.body?.messages);
  if (!history) return res.status(400).json({ error: "Send { messages: [{ role, content }] } ending with a user message" });

  const messages = [{ role: "system", content: SYSTEM }, ...history];

  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const r = await fetch(`${BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_KEY}`,
          "X-Title": "Site chat assistant",
        },
        body: JSON.stringify({ model: MODEL, max_tokens: 1024, tools: TOOLS, messages }),
      });

      if (!r.ok) {
        console.error("LLM API error", r.status, await r.text());
        return res.status(502).json({ error: "The assistant is unavailable right now." });
      }

      const data = await r.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) {
        console.error("Unexpected response", JSON.stringify(data).slice(0, 500));
        return res.status(502).json({ error: "The assistant is unavailable right now." });
      }

      if (msg.tool_calls?.length) {
        messages.push({ role: "assistant", content: msg.content ?? null, tool_calls: msg.tool_calls });
        for (const call of msg.tool_calls) {
          let content;
          try {
            const args = JSON.parse(call.function.arguments || "{}");
            content = JSON.stringify(await searchRecords(args.query ?? ""));
          } catch (err) {
            console.error("Tool error", err);
            content = "Database error";
          }
          messages.push({ role: "tool", tool_call_id: call.id, content });
        }
        continue;
      }

      const reply = (msg.content || "").trim();
      return res.status(200).json({ reply: reply || "Sorry, I couldn't come up with an answer." });
    }
    return res.status(200).json({ reply: "Sorry, I couldn't find an answer. Please try rephrasing." });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
