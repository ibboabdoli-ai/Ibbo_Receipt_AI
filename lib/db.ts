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

const additionalColumns = [
  ["document_type", "TEXT DEFAULT 'receipt'"],
  ["file_name", "TEXT"],
  ["mime_type", "TEXT"],
  ["file_hash", "TEXT"],
  ["invoice_number", "TEXT"],
  ["supplier_org_number", "TEXT"],
  ["supplier_vat_number", "TEXT"],
  ["due_date", "TEXT"],
  ["net_amount", "REAL"],
  ["vat_rate", "REAL"],
  ["vat_country", "TEXT"],
  ["ocr_reference", "TEXT"],
  ["original_currency", "TEXT"],
  ["exchange_rate", "REAL"],
  ["amount_sek", "REAL"],
  ["account_code", "TEXT"],
  ["payment_account", "TEXT"],
  ["cost_center", "TEXT"],
  ["project_code", "TEXT"],
  ["deductible_vat", "REAL"],
  ["approval_status", "TEXT DEFAULT 'pending'"],
  ["approved_at", "TEXT"],
  ["archived_at", "TEXT"],
  ["duplicate_of", "TEXT"],
  ["updated_at", "TEXT"],
] as const;

let schemaPromise: Promise<void> | null = null;

async function ensureSchema() {
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      document_type TEXT DEFAULT 'receipt',
      file_name TEXT,
      mime_type TEXT,
      file_hash TEXT,
      invoice_number TEXT,
      supplier_org_number TEXT,
      supplier_vat_number TEXT,
      due_date TEXT,
      net_amount REAL,
      vat_rate REAL,
      vat_country TEXT,
      ocr_reference TEXT,
      original_currency TEXT,
      exchange_rate REAL,
      amount_sek REAL,
      account_code TEXT,
      payment_account TEXT,
      cost_center TEXT,
      project_code TEXT,
      deductible_vat REAL,
      approval_status TEXT DEFAULT 'pending',
      approved_at TEXT,
      archived_at TEXT,
      duplicate_of TEXT,
      updated_at TEXT
    );
  `);

  const info = await db.execute("PRAGMA table_info(receipts)");
  const existing = new Set(
    info.rows
      .map((row) => String(row.name ?? ""))
      .filter(Boolean),
  );

  for (const [name, definition] of additionalColumns) {
    if (!existing.has(name)) {
      await db.execute(`ALTER TABLE receipts ADD COLUMN ${name} ${definition}`);
    }
  }

  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(date)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_status ON receipts(status)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_expense_type ON receipts(expense_type)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_approval ON receipts(approval_status)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_archived ON receipts(archived_at)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_receipts_file_hash ON receipts(file_hash)",
  );

  await db.execute(`
    UPDATE receipts
    SET
      original_currency = COALESCE(NULLIF(original_currency, ''), currency, 'SEK'),
      amount_sek = CASE
        WHEN UPPER(COALESCE(currency, 'SEK')) = 'SEK' AND amount_sek IS NULL THEN amount
        ELSE amount_sek
      END,
      exchange_rate = CASE
        WHEN UPPER(COALESCE(currency, 'SEK')) = 'SEK' AND exchange_rate IS NULL THEN 1
        ELSE exchange_rate
      END,
      approval_status = COALESCE(NULLIF(approval_status, ''), 'pending'),
      document_type = COALESCE(NULLIF(document_type, ''), 'receipt'),
      updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
  `);
}

export function ensureReceiptsTable() {
  if (!schemaPromise) {
    schemaPromise = ensureSchema().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }

  return schemaPromise;
}
