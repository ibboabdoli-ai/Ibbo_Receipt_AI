import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "../../../components/status-badge";
import { db, ensureReceiptsTable } from "../../../lib/db";
import { formatCurrency, formatDate, type Receipt } from "../../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReceiptDetailPageProps = {
  params: Promise<{ id: string }>;
};

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

function toNullableText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function normalizeConfidence(value: unknown) {
  const confidence = toNumber(value, 0);
  if (confidence > 1) return confidence / 100;
  return confidence;
}

function toReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: toText(row.id, "unknown"),
    date: toText(row.date, new Date().toISOString().slice(0, 10)),
    merchant: toText(row.merchant, "Unknown merchant"),
    amount: toNumber(row.amount),
    currency: toText(row.currency, "SEK"),
    category: toText(row.category, "Unknown / Needs review") as Receipt["category"],
    expense_type: toText(row.expense_type, "unknown") as Receipt["expense_type"],
    vat_amount: row.vat_amount === null ? null : toNumber(row.vat_amount),
    payment_method: toNullableText(row.payment_method),
    confidence: normalizeConfidence(row.confidence),
    image_url: toNullableText(row.image_url),
    notes: toNullableText(row.notes),
    status: toText(row.status, "processed") as Receipt["status"],
    created_at: toText(row.created_at, new Date().toISOString()),
  };
}

async function getReceipt(id: string) {
  await ensureReceiptsTable();

  const result = await db.execute({
    sql: "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts WHERE id = ? LIMIT 1",
    args: [id],
  });

  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? toReceipt(row) : null;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-slate-800">{value}</p>
    </div>
  );
}

export default async function ReceiptDetailPage({ params }: ReceiptDetailPageProps) {
  const { id } = await params;
  const receipt = await getReceipt(id);

  if (!receipt) {
    notFound();
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Receipt detail</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{receipt.merchant}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              Review extracted receipt data before manual correction and export are enabled.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={receipt.status} />
            <Link className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-black text-slate-700" href="/receipts">
              Back to receipts
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatCurrency(receipt.amount, receipt.currency)}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Date</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{formatDate(receipt.date)}</p>
        </div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Confidence</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{(receipt.confidence * 100).toFixed(0)}%</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-950">Extracted fields</h2>
          <div className="mt-5 grid gap-3">
            <DetailItem label="Category" value={receipt.category} />
            <DetailItem label="Type" value={receipt.expense_type} />
            <DetailItem label="VAT" value={receipt.vat_amount === null ? "Not detected" : formatCurrency(receipt.vat_amount, receipt.currency)} />
            <DetailItem label="Payment method" value={receipt.payment_method ?? "Not detected"} />
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-xl font-black text-slate-950">Review info</h2>
          <div className="mt-5 grid gap-3">
            <DetailItem label="Receipt ID" value={receipt.id} />
            <DetailItem label="Created" value={receipt.created_at} />
            <DetailItem label="Notes" value={receipt.notes ?? "No notes"} />
          </div>
          {receipt.image_url ? (
            <a
              className="mt-5 inline-block rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white"
              href={receipt.image_url}
              rel="noreferrer"
              target="_blank"
            >
              Open stored image
            </a>
          ) : null}
        </div>
      </section>
    </div>
  );
}
