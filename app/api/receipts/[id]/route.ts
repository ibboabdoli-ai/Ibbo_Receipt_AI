import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../../lib/db";
import { getReceiptById } from "../../../../lib/receipt-store";
import {
  approvalStatuses,
  expenseTypes,
  receiptStatuses,
  type ApprovalStatus,
  type ExpenseType,
  type ReceiptStatus,
} from "../../../../lib/receipts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type UpdateBody = Record<string, unknown>;

function cleanText(value: unknown, fallback: string, maxLength = 500) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return (trimmed || fallback).slice(0, maxLength);
}

function cleanNullableText(
  value: unknown,
  fallback: string | null,
  maxLength = 500,
) {
  if (value === null || value === "") return null;
  if (value === undefined) return fallback;
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
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
  if (value === undefined) return fallback;
  const parsed = cleanNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function validStatus(value: unknown, fallback: ReceiptStatus) {
  const next = cleanText(value, fallback);
  return receiptStatuses.includes(next as ReceiptStatus)
    ? (next as ReceiptStatus)
    : fallback;
}

function validExpenseType(value: unknown, fallback: ExpenseType) {
  const next = cleanText(value, fallback);
  return expenseTypes.includes(next as ExpenseType)
    ? (next as ExpenseType)
    : fallback;
}

function validApproval(value: unknown, fallback: ApprovalStatus) {
  const next = cleanText(value, fallback);
  return approvalStatuses.includes(next as ApprovalStatus)
    ? (next as ApprovalStatus)
    : fallback;
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  const { id } = await context.params;
  const receipt = await getReceiptById(id);

  if (!receipt) {
    return NextResponse.json(
      { ok: false, error: "Receipt not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true, receipt });
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await ensureReceiptsTable();
    const { id } = await context.params;
    const current = await getReceiptById(id);

    if (!current) {
      return NextResponse.json(
        { ok: false, error: "Receipt not found." },
        { status: 404 },
      );
    }

    const body = (await request.json()) as UpdateBody;
    const amount = Math.max(0, cleanNumber(body.amount, current.amount));
    const currency = cleanText(body.currency, current.currency, 3).toUpperCase();
    const exchangeRate = cleanNullableNumber(
      body.exchange_rate,
      current.exchange_rate,
    );

    let amountSek = cleanNullableNumber(body.amount_sek, current.amount_sek);
    if (currency === "SEK") {
      amountSek = amount;
    } else if (
      body.amount_sek === undefined &&
      exchangeRate !== null &&
      exchangeRate > 0
    ) {
      amountSek = Math.round(amount * exchangeRate * 100) / 100;
    }

    const status = validStatus(body.status, current.status);
    const expenseType = validExpenseType(
      body.expense_type,
      current.expense_type,
    );
    const approvalStatus = validApproval(
      body.approval_status,
      current.approval_status,
    );
    const approvedAt =
      approvalStatus === "approved"
        ? current.approved_at || new Date().toISOString()
        : null;
    const confidenceInput =
      body.confidence === undefined
        ? Math.round(current.confidence * 100)
        : cleanNumber(body.confidence, Math.round(current.confidence * 100));
    const confidence =
      confidenceInput <= 1
        ? Math.round(confidenceInput * 100)
        : Math.max(0, Math.min(100, Math.round(confidenceInput)));

    const receipt = {
      date: cleanText(body.date, current.date, 10),
      dueDate: cleanNullableText(body.due_date, current.due_date, 10),
      merchant: cleanText(body.merchant, current.merchant, 300),
      amount,
      currency,
      category: cleanText(body.category, current.category, 100),
      expenseType,
      vatAmount: cleanNullableNumber(body.vat_amount, current.vat_amount),
      paymentMethod: cleanNullableText(
        body.payment_method,
        current.payment_method,
        100,
      ),
      confidence,
      notes: cleanNullableText(body.notes, current.notes, 2000),
      status,
      documentType: cleanText(
        body.document_type,
        current.document_type,
        40,
      ),
      invoiceNumber: cleanNullableText(
        body.invoice_number,
        current.invoice_number,
        120,
      ),
      supplierOrgNumber: cleanNullableText(
        body.supplier_org_number,
        current.supplier_org_number,
        80,
      ),
      supplierVatNumber: cleanNullableText(
        body.supplier_vat_number,
        current.supplier_vat_number,
        80,
      ),
      netAmount: cleanNullableNumber(body.net_amount, current.net_amount),
      vatRate: cleanNullableNumber(body.vat_rate, current.vat_rate),
      vatCountry: cleanNullableText(
        body.vat_country,
        current.vat_country,
        2,
      )?.toUpperCase() ?? null,
      ocrReference: cleanNullableText(
        body.ocr_reference,
        current.ocr_reference,
        120,
      ),
      exchangeRate,
      amountSek,
      accountCode: cleanNullableText(
        body.account_code,
        current.account_code,
        20,
      ),
      paymentAccount: cleanNullableText(
        body.payment_account,
        current.payment_account,
        20,
      ),
      costCenter: cleanNullableText(
        body.cost_center,
        current.cost_center,
        80,
      ),
      projectCode: cleanNullableText(
        body.project_code,
        current.project_code,
        80,
      ),
      deductibleVat: cleanNullableNumber(
        body.deductible_vat,
        current.deductible_vat,
      ),
      approvalStatus,
      approvedAt,
    };

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
          account_code = ?,
          payment_account = ?,
          cost_center = ?,
          project_code = ?,
          deductible_vat = ?,
          approval_status = ?,
          approved_at = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [
        receipt.date,
        receipt.dueDate,
        receipt.merchant,
        receipt.amount,
        receipt.currency,
        receipt.currency,
        receipt.category,
        receipt.expenseType,
        receipt.vatAmount,
        receipt.paymentMethod,
        receipt.confidence,
        receipt.notes,
        receipt.status,
        receipt.documentType,
        receipt.invoiceNumber,
        receipt.supplierOrgNumber,
        receipt.supplierVatNumber,
        receipt.netAmount,
        receipt.vatRate,
        receipt.vatCountry,
        receipt.ocrReference,
        receipt.exchangeRate,
        receipt.amountSek,
        receipt.accountCode,
        receipt.paymentAccount,
        receipt.costCenter,
        receipt.projectCode,
        receipt.deductibleVat,
        receipt.approvalStatus,
        receipt.approvedAt,
        id,
      ],
    });

    return NextResponse.json({
      ok: true,
      receipt: await getReceiptById(id),
    });
  } catch (error) {
    console.error("PATCH /api/receipts/[id] failed", error);

    return NextResponse.json(
      { ok: false, error: "Failed to update receipt." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { action?: string };

    if (body.action !== "restore") {
      return NextResponse.json(
        { ok: false, error: "Unsupported action." },
        { status: 400 },
      );
    }

    await ensureReceiptsTable();
    await db.execute({
      sql: `
        UPDATE receipts
        SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [id],
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/receipts/[id] failed", error);
    return NextResponse.json(
      { ok: false, error: "Failed to restore receipt." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext,
) {
  try {
    await ensureReceiptsTable();
    const { id } = await context.params;
    const receipt = await getReceiptById(id);

    if (!receipt) {
      return NextResponse.json(
        { ok: false, error: "Receipt not found." },
        { status: 404 },
      );
    }

    const mode = request.nextUrl.searchParams.get("mode");

    if (mode === "permanent") {
      await db.execute({
        sql: "DELETE FROM receipts WHERE id = ?",
        args: [id],
      });

      if (receipt.image_url) {
        await del(receipt.image_url).catch((error) => {
          console.error("Blob deletion failed", error);
        });
      }

      return NextResponse.json({ ok: true, deleted: true });
    }

    await db.execute({
      sql: `
        UPDATE receipts
        SET
          archived_at = CURRENT_TIMESTAMP,
          approval_status = 'pending',
          approved_at = NULL,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      args: [id],
    });

    return NextResponse.json({ ok: true, archived: true });
  } catch (error) {
    console.error("DELETE /api/receipts/[id] failed", error);
    return NextResponse.json(
      { ok: false, error: "Failed to remove receipt." },
      { status: 500 },
    );
  }
}
