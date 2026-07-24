import Link from "next/link";
import { notFound } from "next/navigation";
import { ApprovalBadge } from "../../../components/approval-badge";
import { ReceiptActions } from "../../../components/receipt-actions";
import { StatusBadge } from "../../../components/status-badge";
import { getReceiptById } from "../../../lib/receipt-store";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
} from "../../../lib/receipts";
import { ReceiptEditForm } from "./receipt-edit-form";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReceiptDetailPageProps = {
  params: Promise<{ id: string }>;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

export default async function ReceiptDetailPage({
  params,
}: ReceiptDetailPageProps) {
  const { id } = await params;
  const receipt = await getReceiptById(id);

  if (!receipt) {
    notFound();
  }

  const isImage = receipt.mime_type?.startsWith("image/");

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Receipt detail
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              {receipt.merchant}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              Review extraction, confirm currency conversion, complete
              bookkeeping fields, and approve before export.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={receipt.status} />
            <ApprovalBadge status={receipt.approval_status} />
            {receipt.archived_at ? (
              <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-700">
                Archived
              </span>
            ) : null}
            <Link
              className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-black text-slate-700"
              href="/receipts"
            >
              Back
            </Link>
          </div>
        </div>
      </section>

      {receipt.duplicate_of ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-800">
          Possible duplicate of{" "}
          <Link
            className="underline underline-offset-4"
            href={`/receipts/${receipt.duplicate_of}`}
          >
            another receipt
          </Link>
          . Verify before approval.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Original amount
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {formatCurrency(receipt.amount, receipt.currency)}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            SEK equivalent
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {receipt.amount_sek === null
              ? "Not set"
              : formatCurrency(receipt.amount_sek)}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Date
          </p>
          <p className="mt-2 text-2xl font-black text-slate-950">
            {formatDate(receipt.date)}
          </p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            Confidence
          </p>
          <p className="mt-2 text-3xl font-black text-slate-950">
            {(receipt.confidence * 100).toFixed(0)}%
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-slate-950">
              Extracted document
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Document type" value={receipt.document_type} />
              <DetailItem label="Category" value={receipt.category} />
              <DetailItem label="Type" value={receipt.expense_type} />
              <DetailItem
                label="VAT"
                value={
                  receipt.vat_amount === null
                    ? "Not detected"
                    : formatCurrency(receipt.vat_amount, receipt.currency)
                }
              />
              <DetailItem
                label="Net amount"
                value={
                  receipt.net_amount === null
                    ? "Not detected"
                    : formatCurrency(receipt.net_amount, receipt.currency)
                }
              />
              <DetailItem
                label="VAT rate"
                value={
                  receipt.vat_rate === null
                    ? "Not detected"
                    : `${receipt.vat_rate}%`
                }
              />
              <DetailItem
                label="Payment method"
                value={receipt.payment_method ?? "Not detected"}
              />
              <DetailItem
                label="Invoice number"
                value={receipt.invoice_number ?? "Not detected"}
              />
              <DetailItem
                label="Supplier org. no."
                value={receipt.supplier_org_number ?? "Not detected"}
              />
              <DetailItem
                label="Supplier VAT no."
                value={receipt.supplier_vat_number ?? "Not detected"}
              />
              <DetailItem
                label="OCR / reference"
                value={receipt.ocr_reference ?? "Not detected"}
              />
              <DetailItem
                label="Due date"
                value={formatDate(receipt.due_date)}
              />
            </div>
          </div>

          <ReceiptActions
            archived={Boolean(receipt.archived_at)}
            id={receipt.id}
          />
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-slate-950">
              Stored document
            </h2>
            {receipt.image_url ? (
              <>
                {isImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    alt={`Stored document for ${receipt.merchant}`}
                    className="mt-5 max-h-[720px] w-full rounded-2xl border border-slate-200 object-contain"
                    src={`/api/receipts/${receipt.id}/image`}
                  />
                ) : (
                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
                    <p className="text-5xl">PDF</p>
                    <p className="mt-3 break-all font-bold text-slate-700">
                      {receipt.file_name || "Stored PDF"}
                    </p>
                  </div>
                )}
                <a
                  className="mt-5 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white"
                  href={`/api/receipts/${receipt.id}/image`}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open securely
                </a>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                This receipt has no stored document.
              </p>
            )}
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-black text-slate-950">Audit info</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <DetailItem label="Receipt ID" value={receipt.id} />
              <DetailItem
                label="Created"
                value={formatDateTime(receipt.created_at)}
              />
              <DetailItem
                label="Updated"
                value={formatDateTime(receipt.updated_at)}
              />
              <DetailItem
                label="Approved"
                value={formatDateTime(receipt.approved_at)}
              />
              <DetailItem
                label="File"
                value={receipt.file_name ?? "No filename"}
              />
              <DetailItem
                label="Notes"
                value={receipt.notes ?? "No notes"}
              />
            </div>
          </div>
        </div>
      </section>

      <ReceiptEditForm receipt={receipt} />
    </div>
  );
}
