import Link from "next/link";
import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReviewReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  expenseType: string;
  status: string;
  confidence: number;
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

function normalizeConfidence(value: unknown) {
  const confidence = toNumber(value, 0);
  if (confidence > 1) return confidence / 100;
  return confidence;
}

function needsManualReview(receipt: ReviewReceipt) {
  return (
    receipt.status === "needs_review" ||
    receipt.category.toLowerCase().includes("unknown") ||
    receipt.expenseType === "unknown" ||
    receipt.confidence < 0.7
  );
}

async function getReviewReceipts(): Promise<ReviewReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT id, date, merchant, amount, currency, category, expense_type, status, confidence FROM receipts ORDER BY created_at DESC LIMIT 100",
  );

  return result.rows
    .map((row) => ({
      id: toText(row.id, "unknown"),
      date: toText(row.date, new Date().toISOString().slice(0, 10)),
      merchant: toText(row.merchant, "Unknown merchant"),
      amount: toNumber(row.amount),
      currency: toText(row.currency, "SEK"),
      category: toText(row.category, "Unknown"),
      expenseType: toText(row.expense_type, "unknown"),
      status: toText(row.status, "processed"),
      confidence: normalizeConfidence(row.confidence),
    }))
    .filter(needsManualReview);
}

export default async function ReviewPage() {
  let receipts: ReviewReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getReviewReceipts();
  } catch (error) {
    console.error("Review page failed", error);
    errorMessage = "Could not load review queue from Turso.";
  }

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Review</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Review queue</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Check receipts that need manual correction before export, reports, and bokforing preparation.
        </p>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {receipts.length > 0 ? (
        <section className="space-y-4">
          {receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{receipt.merchant}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.category} · {receipt.expenseType} · {receipt.status} · {Math.round(receipt.confidence * 100)}% confidence
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-2xl font-black text-slate-950">{formatCurrency(receipt.amount)}</p>
                  <Link className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white" href={`/receipts/${receipt.id}`}>
                    Open review
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No receipts need manual review right now.
        </div>
      )}
    </div>
  );
}
