import { NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../lib/db";

export const runtime = "nodejs";

type CreateReceiptBody = {
  date?: string;
  merchant?: string;
  amount?: number;
  currency?: string;
  category?: string;
  expense_type?: string;
  vat_amount?: number | null;
  payment_method?: string | null;
  notes?: string | null;
};

function cleanText(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanNumber(value: unknown, fallback: number | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export async function GET() {
  try {
    await ensureReceiptsTable();

    const result = await db.execute(
      "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts ORDER BY created_at DESC LIMIT 50",
    );

    return NextResponse.json({
      ok: true,
      receipts: result.rows,
    });
  } catch (error) {
    console.error("GET /api/receipts failed", error);

    return NextResponse.json(
      {
        ok: false,
        receipts: [],
        error: "Failed to load receipts",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    await ensureReceiptsTable();

    const body = (await request.json()) as CreateReceiptBody;

    const id = crypto.randomUUID();
    const date = cleanText(body.date, new Date().toISOString().slice(0, 10));
    const merchant = cleanText(body.merchant, "Test Merchant");
    const amount = cleanNumber(body.amount, 0);
    const currency = cleanText(body.currency, "SEK");
    const category = cleanText(body.category, "Unknown");
    const expenseType = cleanText(body.expense_type, "unknown");
    const vatAmount = cleanNumber(body.vat_amount, null);
    const paymentMethod = cleanText(body.payment_method, "");
    const notes = cleanText(body.notes, "Created from test POST");

    await db.execute({
      sql: `
        INSERT INTO receipts (
          id,
          date,
          merchant,
          amount,
          currency,
          category,
          expense_type,
          vat_amount,
          payment_method,
          confidence,
          image_url,
          notes,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        date,
        merchant,
        amount,
        currency,
        category,
        expenseType,
        vatAmount,
        paymentMethod,
        100,
        null,
        notes,
        "processed",
      ],
    });

    return NextResponse.json(
      {
        ok: true,
        receipt: {
          id,
          date,
          merchant,
          amount,
          currency,
          category,
          expense_type: expenseType,
          vat_amount: vatAmount,
          payment_method: paymentMethod,
          confidence: 100,
          image_url: null,
          notes,
          status: "processed",
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/receipts failed", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create receipt",
      },
      { status: 500 },
    );
  }
}
