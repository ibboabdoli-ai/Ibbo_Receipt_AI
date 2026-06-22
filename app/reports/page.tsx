import { CategoryList } from "../../components/category-list";
import { StatCard } from "../../components/stat-card";
import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency, type CategoryTotal } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReportReceipt = {
  amount: number;
  category: string;
  status: string;
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

function getTotalAmount(receipts: ReportReceipt[]) {
  return receipts.reduce((total, receipt) => total + receipt.amount, 0);
}

function getCategoryTotals(receipts: ReportReceipt[]): CategoryTotal[] {
  const total = getTotalAmount(receipts);
  const byCategory = new Map<string, { amount: number; count: number }>();

  for (const receipt of receipts) {
    const existing = byCategory.get(receipt.category) ?? { amount: 0, count: 0 };
    byCategory.set(receipt.category, {
      amount: existing.amount + receipt.amount,
      count: existing.count + 1,
    });
  }

  return Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category: category as CategoryTotal["category"],
      amount: value.amount,
      count: value.count,
      percentage: total === 0 ? 0 : (value.amount / total) * 100,
    }))
    .sort((a, b) => b.amount - a.amount);
}

async function getReportReceipts(): Promise<ReportReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT amount, category, status FROM receipts ORDER BY created_at DESC LIMIT 500",
  );

  return result.rows.map((row) => ({
    amount: toNumber(row.amount),
    category: toText(row.category, "Unknown / Needs review"),
    status: toText(row.status, "processed"),
  }));
}

export default async function ReportsPage() {
  let receipts: ReportReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getReportReceipts();
  } catch (error) {
    console.error("Reports page failed", error);
    errorMessage = "Could not load live report data from Turso.";
  }

  const categoryTotals = getCategoryTotals(receipts);
  const totalAmount = getTotalAmount(receipts);
  const topCategory = categoryTotals[0];
  const unknownAmount = getTotalAmount(
    receipts.filter(
      (receipt) => receipt.category === "Unknown / Needs review" || receipt.status === "needs_review",
    ),
  );

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Reports</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Monthly category summary</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Live Turso report data from saved receipts. Review category totals, unknown costs, and future export readiness.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Total amount from live Turso receipts." label="Month total" value={formatCurrency(totalAmount)} />
        <StatCard helper="Largest live category." label="Top category" tone="amber" value={topCategory?.category ?? "None"} />
        <StatCard helper="Needs review before export." label="Review amount" tone="rose" value={formatCurrency(unknownAmount)} />
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft sm:p-6">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Summary</p>
            <h2 className="text-2xl font-black text-slate-950">Category totals</h2>
          </div>
          {categoryTotals.length > 0 ? (
            <CategoryList totals={categoryTotals} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-600">
              No receipt data saved yet. Create a test receipt from the upload page.
            </div>
          )}
        </div>
        <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Export plan</p>
          <h2 className="mt-2 text-2xl font-black">Ready for Phase 2</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-300">
            <li>CSV export for spreadsheet review.</li>
            <li>Excel export for monthly bokföring preparation.</li>
            <li>Review queue for high-value and unknown receipts.</li>
            <li>Business/private correction before report locking.</li>
          </ul>
        </aside>
      </section>
    </div>
  );
}
