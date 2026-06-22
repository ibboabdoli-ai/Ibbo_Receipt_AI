import Link from "next/link";
import { CategoryList } from "../components/category-list";
import { ReceiptTable } from "../components/receipt-table";
import { StatCard } from "../components/stat-card";
import { db, ensureReceiptsTable } from "../lib/db";
import { formatCurrency, getCategoryTotals, getTotalAmount, type Receipt } from "../lib/receipts";

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

async function getDashboardReceipts(): Promise<Receipt[]> {
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

export default async function DashboardPage() {
  let receipts: Receipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getDashboardReceipts();
  } catch (error) {
    console.error("Dashboard page failed", error);
    errorMessage = "Could not load live dashboard data from Turso.";
  }

  const totalAmount = getTotalAmount(receipts);
  const needsReview = receipts.filter((receipt) => receipt.status === "needs_review").length;
  const businessAmount = getTotalAmount(receipts.filter((receipt) => receipt.expense_type === "business"));
  const privateAmount = getTotalAmount(receipts.filter((receipt) => receipt.expense_type === "private"));
  const categoryTotals = getCategoryTotals(receipts);
  const recentReceipts = receipts.slice(0, 4);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">Live MVP</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Scan receipts, extract costs with AI, and monitor monthly spending.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Live dashboard for private, business, and needs-review receipts. Uploads are stored in Vercel Blob, processed by OpenAI, and saved in Turso.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link className="rounded-2xl bg-white px-5 py-3 text-center font-black text-slate-950" href="/receipts/new">
                Upload receipt
              </Link>
              <Link className="rounded-2xl border border-white/20 px-5 py-3 text-center font-black text-white" href="/reports">
                View reports
              </Link>
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-white/10 p-5 ring-1 ring-white/10">
            <p className="text-sm font-semibold text-slate-300">Monthly total</p>
            <p className="mt-2 text-5xl font-black">{formatCurrency(totalAmount)}</p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-300">Needs review</p>
                <p className="mt-1 text-2xl font-black">{needsReview}</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-300">Receipts</p>
                <p className="mt-1 text-2xl font-black">{receipts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard helper="Live Turso total for saved receipts." label="Total spend" value={formatCurrency(totalAmount)} />
        <StatCard helper="Marked as business cost." label="Business" tone="emerald" value={formatCurrency(businessAmount)} />
        <StatCard helper="Marked as private cost." label="Private" tone="amber" value={formatCurrency(privateAmount)} />
        <StatCard helper="Waiting for manual review." label="Review queue" tone="rose" value={`${needsReview} items`} />
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Categories</p>
              <h2 className="text-2xl font-black text-slate-950">Expense split</h2>
            </div>
          </div>
          {categoryTotals.length > 0 ? (
            <CategoryList totals={categoryTotals} />
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              No receipt data yet. Upload a receipt to start live dashboard tracking.
            </div>
          )}
        </div>
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Recent</p>
              <h2 className="text-2xl font-black text-slate-950">Latest receipts</h2>
            </div>
            <Link className="text-sm font-black text-slate-950 underline underline-offset-4" href="/receipts">
              View all
            </Link>
          </div>
          {recentReceipts.length > 0 ? (
            <ReceiptTable receipts={recentReceipts} />
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
              No recent receipts yet.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
