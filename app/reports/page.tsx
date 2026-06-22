import { CategoryList } from "../../components/category-list";
import { StatCard } from "../../components/stat-card";
import { formatCurrency, getCategoryTotals, getTotalAmount, sampleReceipts } from "../../lib/receipts";

export default function ReportsPage() {
  const categoryTotals = getCategoryTotals(sampleReceipts);
  const totalAmount = getTotalAmount(sampleReceipts);
  const topCategory = categoryTotals[0];
  const unknownAmount = getTotalAmount(
    sampleReceipts.filter((receipt) => receipt.category === "Unknown / Needs review" || receipt.status === "needs_review")
  );

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Reports</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Monthly category summary</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Review spending pressure by category, flag unknown costs, and prepare future CSV or bokföring export.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Total amount from current receipt sample." label="Month total" value={formatCurrency(totalAmount)} />
        <StatCard helper="Largest category this month." label="Top category" tone="amber" value={topCategory?.category ?? "None"} />
        <StatCard helper="Needs review before export." label="Review amount" tone="rose" value={formatCurrency(unknownAmount)} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Summary</p>
            <h2 className="text-2xl font-black text-slate-950">Category totals</h2>
          </div>
          <CategoryList totals={categoryTotals} />
        </div>
        <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Export plan</p>
          <h2 className="mt-2 text-2xl font-black">Ready for Phase 2</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <li>CSV export for spreadsheet review.</li>
            <li>Excel export for monthly bokföring preparation.</li>
            <li>Review queue for PayPal and high-value receipts.</li>
            <li>Business/private correction before report locking.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
