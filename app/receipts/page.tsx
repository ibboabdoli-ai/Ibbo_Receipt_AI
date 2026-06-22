import Link from "next/link";
import { ReceiptTable } from "../../components/receipt-table";
import { StatCard } from "../../components/stat-card";
import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency, getTotalAmount, type Receipt } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

async function getReceipts(): Promise<Receipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts ORDER BY created_at DESC LIMIT 50",
  );

  return result.rows.map((row) => ({
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
  }));
}

export default async function ReceiptsPage() {
  let receipts: Receipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getReceipts();
  } catch (error) {
    console.error("Receipts page failed", error);
    errorMessage = "Could not load live receipts from Turso.";
  }

  const totalAmount = getTotalAmount(receipts);
  const needsReview = receipts.filter((receipt) => receipt.status === "needs_review").length;
  const processed = receipts.filter((receipt) => receipt.status === "processed").length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Receipts</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Receipt register</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Live receipt data from Turso. Uploaded receipts are stored in Vercel Blob, processed by OpenAI, and ready for manual review.
          </p>
        </div>
        <Link className="rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white" href="/receipts/new">
          Upload new
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="From live Turso receipts." label="Registered total" value={formatCurrency(totalAmount)} />
        <StatCard helper="Ready for reports and export." label="Processed" tone="emerald" value={`${processed}`} />
        <StatCard helper="Needs manual decision." label="Review" tone="rose" value={`${needsReview}`} />
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {receipts.length > 0 ? (
        <ReceiptTable receipts={receipts} />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No receipts saved yet. Upload a receipt image to start AI extraction and live reporting.
        </div>
      )}
    </div>
  );
}
