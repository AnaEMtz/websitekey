/*
  Chat widget. Embed with:
  <script src="https://YOURNAME.github.io/REPO/chat-widget.js"
          data-api="https://YOUR-APP.vercel.app/api/chat"
          data-title="Ask us anything"
          data-color="#1f5f4a"
          data-greeting="Hi! What can I help you find?" defer></script>

  Do NOT put an API key in this file. It is public. Keys live on the backend only.
*/
(function () {
  const script = document.currentScript;
  const cfg = {
    api: script.dataset.api,
    title: script.dataset.title || "Ask us anything",
    color: script.dataset.color || "#1f5f4a",
    greeting: script.dataset.greeting || "Hi! What can I help you find?",
  };
  if (!cfg.api) return console.error("chat-widget: missing data-api");

  function esc(s) {
    return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  const host = document.createElement("div");
  document.body.appendChild(host);
  const root = host.attachShadow({ mode: "open" });

  root.innerHTML = `
  <style>
    :host { all: initial; }
    * { box-sizing: border-box; }
    .wrap { --c: ${esc(cfg.color)}; position: fixed; right: 20px; bottom: 20px; z-index: 2147483000;
      font: 15px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif; color: #1d1d1b; }
    button { font: inherit; cursor: pointer; }
    button:focus-visible, textarea:focus-visible { outline: 3px solid #f2b705; outline-offset: 2px; }
    .launch { background: var(--c); color: #fff; border: 0; border-radius: 999px; padding: 12px 18px;
      box-shadow: 0 4px 16px rgba(0,0,0,.2); }
    .panel { display: none; flex-direction: column; width: min(380px, calc(100vw - 24px));
      height: min(540px, calc(100vh - 100px)); background: #fff; border-radius: 14px;
      box-shadow: 0 8px 32px rgba(0,0,0,.22); overflow: hidden; }
    .wrap.open .panel { display: flex; }
    .wrap.open .launch { display: none; }
    header { background: var(--c); color: #fff; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; }
    header strong { font-weight: 600; }
    .close { background: none; border: 0; color: #fff; font-size: 22px; line-height: 1; padding: 2px 6px; }
    .log { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; background: #f6f6f4; }
    .m { max-width: 85%; padding: 9px 13px; border-radius: 12px; white-space: pre-wrap; word-wrap: break-word; }
    .bot { background: #fff; border: 1px solid #e3e3df; align-self: flex-start; border-bottom-left-radius: 4px; }
    .me { background: var(--c); color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .err { background: #fdecea; border: 1px solid #f5c2bd; align-self: flex-start; }
    form { display: flex; gap: 8px; padding: 12px; border-top: 1px solid #e3e3df; background: #fff; }
    textarea { flex: 1; resize: none; font: inherit; border: 1px solid #c9c9c4; border-radius: 8px; padding: 8px 10px; height: 40px; }
    .send { background: var(--c); color: #fff; border: 0; border-radius: 8px; padding: 0 16px; }
    .send:disabled { opacity: .5; cursor: default; }
    @media (prefers-reduced-motion: no-preference) { .dots { animation: p 1s infinite; } }
    @keyframes p { 50% { opacity: .3; } }
  </style>
  <div class="wrap">
    <button class="launch" aria-label="Open chat">${esc(cfg.title)}</button>
    <section class="panel" role="dialog" aria-label="${esc(cfg.title)}">
      <header><strong>${esc(cfg.title)}</strong><button class="close" aria-label="Close chat">&times;</button></header>
      <div class="log" role="log" aria-live="polite"></div>
      <form><textarea rows="1" placeholder="Type your question" aria-label="Your message" maxlength="2000"></textarea>
      <button class="send" type="submit">Send</button></form>
    </section>
  </div>`;

  const $ = (s) => root.querySelector(s);
  const wrap = $(".wrap"), log = $(".log"), form = $("form"), input = $("textarea"), send = $(".send");
  const history = [];

  function add(text, cls) {
    const el = document.createElement("div");
    el.className = "m " + cls;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function toggle(open) {
    wrap.classList.toggle("open", open);
    if (open) { if (!log.children.length) add(cfg.greeting, "bot"); input.focus(); }
    else $(".launch").focus();
  }

  $(".launch").addEventListener("click", () => toggle(true));
  $(".close").addEventListener("click", () => toggle(false));
  root.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    add(text, "me");
    history.push({ role: "user", content: text });
    send.disabled = true;
    const pending = add("Looking that up…", "bot dots");
    try {
      const r = await fetch(cfg.api, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const data = await r.json();
      pending.remove();
      if (!r.ok) throw new Error(data.error || "Request failed");
      history.push({ role: "assistant", content: data.reply });
      add(data.reply, "bot");
    } catch (err) {
      pending.remove();
      history.pop();
      add("Couldn't reach the assistant. Check your connection and send your message again.", "err");
    } finally {
      send.disabled = false;
      input.focus();
    }
  });
})();
