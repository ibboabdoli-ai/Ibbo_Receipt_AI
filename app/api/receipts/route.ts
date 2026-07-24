import { createHash } from "node:crypto";
import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../lib/db";
import { extractReceiptFromFile } from "../../../lib/extract-receipt";
import {
  listReceipts,
  parseReceiptFilters,
} from "../../../lib/receipt-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function cleanText(value: unknown, fallback = "", maxLength = 1000) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

function safeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9.\-_]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 100) || "receipt"
  );
}

export async function GET(request: NextRequest) {
  try {
    const result = await listReceipts(
      parseReceiptFilters(request.nextUrl.searchParams),
    );

    return NextResponse.json({
      ok: true,
      ...result,
    });
  } catch (error) {
    console.error("GET /api/receipts failed", error);

    return NextResponse.json(
      {
        ok: false,
        receipts: [],
        error: "Failed to load receipts.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  let storedUrl: string | null = null;

  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only multipart receipt uploads are supported.",
        },
        { status: 415 },
      );
    }

    await ensureReceiptsTable();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Receipt image or PDF is required." },
        { status: 400 },
      );
    }

    const isImage = file.type.startsWith("image/");
    const isPdf = file.type === "application/pdf";

    if (!isImage && !isPdf) {
      return NextResponse.json(
        {
          ok: false,
          error: "Only image files and PDF documents are supported.",
        },
        { status: 400 },
      );
    }

    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { ok: false, error: "Document is too large. Maximum size is 15 MB." },
        { status: 400 },
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileHash = createHash("sha256").update(buffer).digest("hex");

    const existingFile = await db.execute({
      sql: `
        SELECT id
        FROM receipts
        WHERE file_hash = ? AND archived_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
      `,
      args: [fileHash],
    });

    const existingId = String(existingFile.rows[0]?.id || "");
    if (existingId) {
      return NextResponse.json(
        {
          ok: false,
          error: "This exact file has already been uploaded.",
          existing_id: existingId,
        },
        { status: 409 },
      );
    }

    const id = crypto.randomUUID();
    const originalName = safeFileName(file.name || (isPdf ? "receipt.pdf" : "receipt.jpg"));
    const blob = await put(
      `receipts/${id}-${originalName}`,
      new Blob([arrayBuffer], { type: file.type }),
      {
        access: "private",
        addRandomSuffix: true,
      },
    );
    storedUrl = blob.url;

    const extraction = await extractReceiptFromFile({
      fileBase64: buffer.toString("base64"),
      mimeType: file.type,
      fileName: originalName,
    });

    const amount = extraction.amount ?? 0;
    const currency = (extraction.currency || "SEK").toUpperCase();
    const amountSek = currency === "SEK" ? amount : null;
    const exchangeRate = currency === "SEK" ? 1 : null;
    const userNotes = cleanText(formData.get("notes"), "", 1000);
    const baseNotes = [userNotes, extraction.notes].filter(Boolean).join(" | ");

    const semanticDuplicate = await db.execute({
      sql: `
        SELECT id
        FROM receipts
        WHERE
          archived_at IS NULL
          AND LOWER(TRIM(merchant)) = LOWER(TRIM(?))
          AND date = ?
          AND ABS(amount - ?) < 0.01
          AND UPPER(currency) = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
      args: [extraction.merchant, extraction.date, amount, currency],
    });

    const duplicateOf = String(semanticDuplicate.rows[0]?.id || "") || null;
    const confidence = Math.max(
      0,
      Math.min(100, Math.round(extraction.confidence)),
    );
    const status =
      duplicateOf ||
      confidence < 80 ||
      amount <= 0 ||
      extraction.merchant === "Uploaded receipt"
        ? "needs_review"
        : "processed";
    const notes = duplicateOf
      ? `${baseNotes} | Possible duplicate of ${duplicateOf}`
      : baseNotes;

    await db.execute({
      sql: `
        INSERT INTO receipts (
          id, date, merchant, amount, currency, category, expense_type,
          vat_amount, payment_method, confidence, image_url, notes, status,
          document_type, file_name, mime_type, file_hash, invoice_number,
          supplier_org_number, supplier_vat_number, due_date, net_amount,
          vat_rate, vat_country, ocr_reference, original_currency,
          exchange_rate, amount_sek, account_code, payment_account,
          deductible_vat, approval_status, duplicate_of, updated_at
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, CURRENT_TIMESTAMP
        )
      `,
      args: [
        id,
        extraction.date,
        extraction.merchant,
        amount,
        currency,
        extraction.category,
        extraction.expenseType,
        extraction.vatAmount,
        extraction.paymentMethod || null,
        confidence,
        blob.url,
        notes || null,
        status,
        extraction.documentType,
        originalName,
        file.type,
        fileHash,
        extraction.invoiceNumber,
        extraction.supplierOrgNumber,
        extraction.supplierVatNumber,
        extraction.dueDate,
        extraction.netAmount,
        extraction.vatRate,
        extraction.vatCountry,
        extraction.ocrReference,
        currency,
        exchangeRate,
        amountSek,
        extraction.accountCode,
        null,
        currency === "SEK" ? extraction.vatAmount : null,
        "pending",
        duplicateOf,
      ],
    });

    return NextResponse.json(
      {
        ok: true,
        receipt: {
          id,
          date: extraction.date,
          merchant: extraction.merchant,
          amount,
          currency,
          status,
          approval_status: "pending",
          duplicate_of: duplicateOf,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/receipts failed", error);

    if (storedUrl) {
      await del(storedUrl).catch((cleanupError) => {
        console.error("Failed to clean up receipt blob", cleanupError);
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to upload and process the receipt.",
      },
      { status: 500 },
    );
  }
}
