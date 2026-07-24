import { NextRequest, NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../../../lib/db";
import { extractReceiptFromFile } from "../../../../../lib/extract-receipt";
import { getReceiptById } from "../../../../../lib/receipt-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    await ensureReceiptsTable();
    const { id } = await context.params;
    const current = await getReceiptById(id);

    if (!current?.image_url) {
      return NextResponse.json(
        { ok: false, error: "Stored document not found." },
        { status: 404 },
      );
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Blob access is not configured." },
        { status: 500 },
      );
    }

    const fileResponse = await fetch(current.image_url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!fileResponse.ok) {
      return NextResponse.json(
        { ok: false, error: "Stored document could not be read." },
        { status: 502 },
      );
    }

    const buffer = Buffer.from(await fileResponse.arrayBuffer());
    const mimeType =
      current.mime_type ||
      fileResponse.headers.get("content-type") ||
      "image/jpeg";
    const extraction = await extractReceiptFromFile({
      fileBase64: buffer.toString("base64"),
      mimeType,
      fileName: current.file_name || "receipt",
    });

    const amount = extraction.amount ?? 0;
    const currency = (extraction.currency || "SEK").toUpperCase();
    const exchangeRate =
      currency === "SEK"
        ? 1
        : current.currency === currency
          ? current.exchange_rate
          : null;
    const amountSek =
      currency === "SEK"
        ? amount
        : exchangeRate
          ? Math.round(amount * exchangeRate * 100) / 100
          : null;

    const duplicate = await db.execute({
      sql: `
        SELECT id
        FROM receipts
        WHERE
          id <> ?
          AND archived_at IS NULL
          AND LOWER(TRIM(merchant)) = LOWER(TRIM(?))
          AND date = ?
          AND ABS(amount - ?) < 0.01
          AND UPPER(currency) = ?
        ORDER BY created_at DESC
        LIMIT 1
      `,
      args: [id, extraction.merchant, extraction.date, amount, currency],
    });
    const duplicateOf = String(duplicate.rows[0]?.id || "") || null;
    const confidence = Math.max(
      0,
      Math.min(100, Math.round(extraction.confidence)),
    );
    const status =
      duplicateOf || confidence < 80 || amount <= 0
        ? "needs_review"
        : "processed";
    const notes = [
      current.notes,
      `AI reprocessed: ${extraction.notes}`,
      duplicateOf ? `Possible duplicate of ${duplicateOf}` : "",
    ]
      .filter(Boolean)
      .join(" | ")
      .slice(0, 2000);

    await db.execute({
      sql: `
        UPDATE receipts
        SET
          date = ?,
          due_date = ?,
          merchant = ?,
          amount = ?,
          currency = ?,
          original_currency = ?,
          category = ?,
          expense_type = ?,
          vat_amount = ?,
          payment_method = ?,
          confidence = ?,
          notes = ?,
          status = ?,
          document_type = ?,
          invoice_number = ?,
          supplier_org_number = ?,
          supplier_vat_number = ?,
          net_amount = ?,
          vat_rate = ?,
          vat_country = ?,
          ocr_reference = ?,
          exchange_rate = ?,
          amount_sek = ?,
          account_code = COALESCE(account_code, ?),
          deductible_vat = CASE
            WHEN ? = 'SEK' THEN ?
            ELSE deductible_vat
          END,
          approval_status = 'pending',
          approved_at = NULL,
          duplicate_of = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        extraction.date,
        extraction.dueDate,
        extraction.merchant,
        amount,
        currency,
        currency,
        extraction.category,
        extraction.expenseType,
        extraction.vatAmount,
        extraction.paymentMethod || null,
        confidence,
        notes,
        status,
        extraction.documentType,
        extraction.invoiceNumber,
        extraction.supplierOrgNumber,
        extraction.supplierVatNumber,
        extraction.netAmount,
        extraction.vatRate,
        extraction.vatCountry,
        extraction.ocrReference,
        exchangeRate,
        amountSek,
        extraction.accountCode,
        currency,
        extraction.vatAmount,
        duplicateOf,
        id,
      ],
    });

    return NextResponse.json({
      ok: true,
      receipt: await getReceiptById(id),
    });
  } catch (error) {
    console.error("POST receipt reprocess failed", error);
    return NextResponse.json(
      { ok: false, error: "AI reprocessing failed." },
      { status: 500 },
    );
  }
}
