import { db, ensureReceiptsTable } from "../../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const columns = [
  "id",
  "date",
  "merchant",
  "amount",
  "currency",
  "category",
  "expense_type",
  "vat_amount",
  "payment_method",
  "confidence",
  "status",
  "notes",
  "image_url",
  "created_at",
] as const;

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function normalizeConfidence(value: unknown) {
  const confidence = toNumber(value, 0);
  if (confidence > 1) return confidence / 100;
  return confidence;
}

function isCleanRow(row: Record<string, unknown>) {
  const merchant = toText(row.merchant, "").toLowerCase();
  const category = toText(row.category, "Unknown").toLowerCase();
  const expenseType = toText(row.expense_type, "unknown");
  const status = toText(row.status, "processed");
  const amount = toNumber(row.amount);
  const confidence = normalizeConfidence(row.confidence);

  return (
    !merchant.includes("test") &&
    !merchant.includes("uploaded receipt") &&
    !category.includes("unknown") &&
    expenseType !== "unknown" &&
    status !== "needs_review" &&
    amount > 0 &&
    confidence >= 0.7
  );
}

function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";

  const text = String(value).replace(/\r?\n/g, " ");
  const escaped = text.replace(/"/g, '""');

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export async function GET() {
  try {
    await ensureReceiptsTable();

    const result = await db.execute(
      "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, status, notes, image_url, created_at FROM receipts ORDER BY created_at DESC LIMIT 1000",
    );

    const rows = result.rows.map((row) => row as unknown as Record<string, unknown>).filter(isCleanRow);
    const header = columns.join(",");
    const body = rows.map((row) => columns.map((column) => csvCell(row[column])).join(","));
    const csv = `\uFEFF${[header, ...body].join("\n")}\n`;

    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="ibbo-clean-receipts-export.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GET /api/receipts/export-clean failed", error);

    return new Response("Failed to export clean receipts\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
