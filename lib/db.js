// ---------------------------------------------------------------------------
// Database adapter. Replace `searchRecords` with a query against YOUR database.
// The assistant calls this whenever it needs facts to answer a visitor.
// Keep it READ-ONLY and return a small number of short records.
// ---------------------------------------------------------------------------

// Sample data so the project works out of the box. Delete once you connect your own.
const SAMPLE = [
  { id: 1, title: "Opening hours", body: "We are open Monday to Friday, 9:00 to 17:30. Closed on weekends." },
  { id: 2, title: "Returns policy", body: "Items can be returned within 30 days with proof of purchase." },
  { id: 3, title: "Shipping", body: "Orders ship within 2 business days. Delivery takes 3 to 5 days in the EU." },
];

export async function searchRecords(query) {
  const words = String(query).toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const hits = SAMPLE.filter((r) => {
    const text = `${r.title} ${r.body}`.toLowerCase();
    return words.some((w) => text.includes(w));
  });
  return hits.slice(0, 5);
}

/* ---- Example: Supabase (npm i @supabase/supabase-js) ----------------------
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export async function searchRecords(query) {
  const { data, error } = await supabase
    .from("articles")
    .select("title, body")
    .textSearch("body", query, { type: "websearch" })
    .limit(5);
  if (error) throw error;
  return data;
}
---------------------------------------------------------------------------- */

/* ---- Example: Postgres (npm i pg) -----------------------------------------
import pg from "pg";
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export async function searchRecords(query) {
  const { rows } = await pool.query(
    "SELECT title, body FROM articles WHERE title ILIKE $1 OR body ILIKE $1 LIMIT 5",
    [`%${query}%`]
  );
  return rows;
}
---------------------------------------------------------------------------- */
