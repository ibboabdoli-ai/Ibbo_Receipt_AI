import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../lib/db";
import { extractReceiptFromImage } from "../../../lib/extract-receipt";

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

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 90);
}

async function insertReceipt(input: {
  id: string;
  date: string;
  merchant: string;
  amount: number | null;
  currency: string;
  category: string;
  expenseType: string;
  vatAmount: number | null;
  paymentMethod: string;
  confidence: number;
  imageUrl: string | null;
  notes: string;
  status: string;
}) {
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
      input.id,
      input.date,
      input.merchant,
      input.amount,
      input.currency,
      input.category,
      input.expenseType,
      input.vatAmount,
      input.paymentMethod,
      input.confidence,
      input.imageUrl,
      input.notes,
      input.status,
    ],
  });
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

async function createReceiptFromJson(request: Request) {
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

  await insertReceipt({
    id,
    date,
    merchant,
    amount,
    currency,
    category,
    expenseType,
    vatAmount,
    paymentMethod,
    confidence: 100,
    imageUrl: null,
    notes,
    status: "processed",
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
}

async function createReceiptFromUpload(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Receipt image is required" },
      { status: 400 },
    );
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json(
      { ok: false, error: "Only image files are supported" },
      { status: 400 },
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json(
      { ok: false, error: "Image is too large. Max 10 MB." },
      { status: 400 },
    );
  }

  const id = crypto.randomUUID();
  const originalName = safeFileName(file.name || "receipt.jpg");
  const imageArrayBuffer = await file.arrayBuffer();
  const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");

  const blob = await put(
    `receipts/${id}-${originalName}`,
    new Blob([imageArrayBuffer], { type: file.type }),
    {
      access: "private",
      addRandomSuffix: true,
    },
  );

  const extraction = await extractReceiptFromImage({
    imageBase64,
    mimeType: file.type,
  });

  const userNotes = cleanText(formData.get("notes"), "");
  const notes = userNotes
    ? `${userNotes} | ${extraction.notes}`
    : extraction.notes;
  const status = extraction.confidence >= 70 ? "processed" : "needs_review";

  await insertReceipt({
    id,
    date: extraction.date,
    merchant: extraction.merchant,
    amount: extraction.amount,
    currency: extraction.currency,
    category: extraction.category,
    expenseType: extraction.expenseType,
    vatAmount: extraction.vatAmount,
    paymentMethod: extraction.paymentMethod,
    confidence: extraction.confidence,
    imageUrl: blob.url,
    notes,
    status,
  });

  return NextResponse.json(
    {
      ok: true,
      receipt: {
        id,
        date: extraction.date,
        merchant: extraction.merchant,
        amount: extraction.amount,
        currency: extraction.currency,
        category: extraction.category,
        expense_type: extraction.expenseType,
        vat_amount: extraction.vatAmount,
        payment_method: extraction.paymentMethod,
        confidence: extraction.confidence,
        image_url: blob.url,
        notes,
        status,
      },
      blob: {
        url: blob.url,
        pathname: blob.pathname,
      },
    },
    { status: 201 },
  );
}

export async function POST(request: Request) {
  try {
    await ensureReceiptsTable();

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      return await createReceiptFromUpload(request);
    }

    return await createReceiptFromJson(request);
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
