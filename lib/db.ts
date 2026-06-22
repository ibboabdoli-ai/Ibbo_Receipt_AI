import { createClient } from "@libsql/client";

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!databaseUrl) {
  throw new Error("Missing TURSO_DATABASE_URL");
}

if (!authToken) {
  throw new Error("Missing TURSO_AUTH_TOKEN");
}

export const db = createClient({
  url: databaseUrl,
  authToken,
});

export async function ensureReceiptsTable() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY,
      date TEXT,
      merchant TEXT,
      amount REAL,
      currency TEXT DEFAULT 'SEK',
      category TEXT,
      expense_type TEXT,
      vat_amount REAL,
      payment_method TEXT,
      confidence INTEGER DEFAULT 0,
      image_url TEXT,
      notes TEXT,
      status TEXT DEFAULT 'processed',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
}
