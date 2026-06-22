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

    const header = columns.join(",");
    const body = result.rows.map((row) => columns.map((column) => csvCell(row[column])).join(","));
    const csv = `\uFEFF${[header, ...body].join("\n")}\n`;

    return new Response(csv, {
      headers: {
        "Cache-Control": "no-store",
        "Content-Disposition": 'attachment; filename="ibbo-receipts-export.csv"',
        "Content-Type": "text/csv; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("GET /api/receipts/export failed", error);

    return new Response("Failed to export receipts\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
