import Link from "next/link";
import { CategoryList } from "../components/category-list";
import { ReceiptTable } from "../components/receipt-table";
import { StatCard } from "../components/stat-card";
import { formatCurrency, getCategoryTotals, getTotalAmount, sampleReceipts } from "../lib/receipts";

export default function DashboardPage() {
  const totalAmount = getTotalAmount(sampleReceipts);
  const needsReview = sampleReceipts.filter((receipt) => receipt.status === "needs_review").length;
  const businessAmount = getTotalAmount(sampleReceipts.filter((receipt) => receipt.expense_type === "business"));
  const privateAmount = getTotalAmount(sampleReceipts.filter((receipt) => receipt.expense_type === "private"));
  const categoryTotals = getCategoryTotals(sampleReceipts);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">Phase 1 MVP</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Scan receipts, classify expenses, and monitor monthly cost pressure.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Mobile-first dashboard for private, business, and needs-review receipts. Upload processing is prepared for Vercel Blob storage, Turso, and AI extraction.
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
                <p className="mt-1 text-2xl font-black">{sampleReceipts.length}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard helper="Current sample data total for this month." label="Total spend" value={formatCurrency(totalAmount)} />
        <StatCard helper="Marked as Iboren/business candidate." label="Business" tone="emerald" value={formatCurrency(businessAmount)} />
        <StatCard helper="Private expenses from imported sample." label="Private" tone="amber" value={formatCurrency(privateAmount)} />
        <StatCard helper="AI confidence is low or type is unknown." label="Review queue" tone="rose" value={`${needsReview} items`} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Categories</p>
              <h2 className="text-2xl font-black text-slate-950">Expense split</h2>
            </div>
          </div>
          <CategoryList totals={categoryTotals} />
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
          <ReceiptTable receipts={sampleReceipts.slice(0, 4)} />
        </div>
      </section>
    </div>
  );
}
