import { NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../../lib/db";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ReceiptRow = {
  id: string;
  date: string | null;
  merchant: string | null;
  amount: number | string | null;
  currency: string | null;
  category: string | null;
  expense_type: string | null;
  vat_amount: number | string | null;
  payment_method: string | null;
  confidence: number | string | null;
  image_url: string | null;
  notes: string | null;
  status: string | null;
  created_at: string | null;
};

type UpdateReceiptBody = {
  date?: unknown;
  merchant?: unknown;
  amount?: unknown;
  currency?: unknown;
  category?: unknown;
  expense_type?: unknown;
  vat_amount?: unknown;
  payment_method?: unknown;
  confidence?: unknown;
  notes?: unknown;
  status?: unknown;
};

const allowedStatuses = new Set(["processed", "needs_review"]);
const allowedExpenseTypes = new Set(["business", "private", "unknown"]);

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanNullableText(value: unknown, fallback: string | null) {
  if (value === null) return null;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanNumber(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function cleanNullableNumber(value: unknown, fallback: number | null) {
  if (value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalizeConfidence(value: unknown, fallback: number) {
  const confidence = cleanNumber(value, fallback);
  if (confidence <= 1) return Math.round(confidence * 100);
  return Math.max(0, Math.min(100, Math.round(confidence)));
}

function rowToReceipt(row: ReceiptRow) {
  return {
    id: row.id,
    date: row.date,
    merchant: row.merchant,
    amount: cleanNumber(row.amount, 0),
    currency: row.currency,
    category: row.category,
    expense_type: row.expense_type,
    vat_amount: cleanNullableNumber(row.vat_amount, null),
    payment_method: row.payment_method,
    confidence: normalizeConfidence(row.confidence, 0),
    image_url: row.image_url,
    notes: row.notes,
    status: row.status,
    created_at: row.created_at,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await ensureReceiptsTable();

    const { id } = await context.params;

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing receipt id" }, { status: 400 });
    }

    const currentResult = await db.execute({
      sql: "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts WHERE id = ? LIMIT 1",
      args: [id],
    });

    const current = currentResult.rows[0] as ReceiptRow | undefined;

    if (!current) {
      return NextResponse.json({ ok: false, error: "Receipt not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateReceiptBody;

    const nextStatus = cleanText(body.status, current.status ?? "needs_review");
    const status = allowedStatuses.has(nextStatus) ? nextStatus : current.status ?? "needs_review";

    const nextExpenseType = cleanText(body.expense_type, current.expense_type ?? "unknown");
    const expenseType = allowedExpenseTypes.has(nextExpenseType) ? nextExpenseType : current.expense_type ?? "unknown";

    const receipt = {
      date: cleanText(body.date, current.date ?? new Date().toISOString().slice(0, 10)),
      merchant: cleanText(body.merchant, current.merchant ?? "Unknown merchant"),
      amount: cleanNumber(body.amount, cleanNumber(current.amount, 0)),
      currency: cleanText(body.currency, current.currency ?? "SEK"),
      category: cleanText(body.category, current.category ?? "Unknown"),
      expense_type: expenseType,
      vat_amount: cleanNullableNumber(body.vat_amount, cleanNullableNumber(current.vat_amount, null)),
      payment_method: cleanNullableText(body.payment_method, current.payment_method),
      confidence: normalizeConfidence(body.confidence, normalizeConfidence(current.confidence, 0)),
      notes: cleanNullableText(body.notes, current.notes),
      status,
    };

    await db.execute({
      sql: `
        UPDATE receipts
        SET
          date = ?,
          merchant = ?,
          amount = ?,
          currency = ?,
          category = ?,
          expense_type = ?,
          vat_amount = ?,
          payment_method = ?,
          confidence = ?,
          notes = ?,
          status = ?
        WHERE id = ?
      `,
      args: [
        receipt.date,
        receipt.merchant,
        receipt.amount,
        receipt.currency,
        receipt.category,
        receipt.expense_type,
        receipt.vat_amount,
        receipt.payment_method,
        receipt.confidence,
        receipt.notes,
        receipt.status,
        id,
      ],
    });

    const updatedResult = await db.execute({
      sql: "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts WHERE id = ? LIMIT 1",
      args: [id],
    });

    const updated = updatedResult.rows[0] as ReceiptRow;

    return NextResponse.json({
      ok: true,
      receipt: rowToReceipt(updated),
    });
  } catch (error) {
    console.error("PATCH /api/receipts/[id] failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to update receipt",
      },
      { status: 500 },
    );
  }
}
