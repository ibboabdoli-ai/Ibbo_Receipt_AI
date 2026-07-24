import { CategoryList } from "../../components/category-list";
import { ReceiptTable } from "../../components/receipt-table";
import { StatCard } from "../../components/stat-card";
import {
  currentMonthKey,
  listReceipts,
  normalizeMonth,
} from "../../lib/receipt-store";
import {
  formatCurrency,
  getCategoryTotalsInSek,
  getCurrencyTotals,
  getMissingExchangeRateCount,
  getSekEquivalentTotal,
} from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ReportsPage({
  searchParams,
}: ReportsPageProps) {
  const params = await searchParams;
  const month = normalizeMonth(first(params.month) || currentMonthKey());
  const result = await listReceipts({
    month,
    page: 1,
    pageSize: 2000,
    sort: "date_desc",
  });
  const receipts = result.receipts;
  const totalSek = getSekEquivalentTotal(receipts);
  const categoryTotals = getCategoryTotalsInSek(receipts);
  const currencyTotals = getCurrencyTotals(receipts);
  const missingFx = getMissingExchangeRateCount(receipts);
  const business = receipts.filter(
    (receipt) => receipt.expense_type === "business",
  );
  const privateReceipts = receipts.filter(
    (receipt) => receipt.expense_type === "private",
  );
  const pending = receipts.filter(
    (receipt) => receipt.approval_status === "pending",
  );
  const approved = receipts.filter(
    (receipt) => receipt.approval_status === "approved",
  );
  const review = receipts.filter(
    (receipt) =>
      receipt.status === "needs_review" ||
      receipt.expense_type === "unknown" ||
      receipt.duplicate_of,
  );

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Reports
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Monthly bookkeeping summary
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
              All metrics are filtered by the receipt date. SEK totals exclude
              foreign-currency rows until a conversion is confirmed.
            </p>
          </div>
          <form className="flex gap-2" method="get">
            <input
              className="rounded-xl border border-slate-200 px-3 py-2 font-bold text-slate-950"
              defaultValue={month}
              name="month"
              type="month"
            />
            <button
              className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
              type="submit"
            >
              Apply
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          helper={`Known SEK value for ${month}.`}
          label="SEK equivalent"
          value={formatCurrency(totalSek)}
        />
        <StatCard
          helper="Rows manually approved for export."
          label="Approved"
          tone="emerald"
          value={`${approved.length}`}
        />
        <StatCard
          helper="Rows still waiting for an accounting decision."
          label="Pending"
          tone="amber"
          value={`${pending.length}`}
        />
        <StatCard
          helper="Foreign-currency rows missing a SEK conversion."
          label="Missing FX"
          tone={missingFx ? "rose" : "emerald"}
          value={`${missingFx}`}
        />
        <StatCard
          helper="Known SEK value for business-tagged receipts."
          label="Business"
          value={formatCurrency(getSekEquivalentTotal(business))}
        />
        <StatCard
          helper="Known SEK value for private-tagged receipts."
          label="Private"
          tone="amber"
          value={formatCurrency(getSekEquivalentTotal(privateReceipts))}
        />
        <StatCard
          helper="Duplicate, unknown, or low-confidence rows."
          label="Review queue"
          tone="rose"
          value={`${review.length}`}
        />
        <StatCard
          helper="All receipt rows in the selected month."
          label="Receipts"
          value={`${receipts.length}`}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Currency control
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">
              Original currency totals
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {currencyTotals.map((item) => (
                <article
                  className="rounded-2xl border border-slate-200 p-4"
                  key={item.currency}
                >
                  <p className="text-sm font-bold text-slate-500">
                    {item.count} receipt{item.count === 1 ? "" : "s"}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">
                    {formatCurrency(item.amount, item.currency)}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-1 text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Categories
            </p>
            <h2 className="mb-4 text-2xl font-black text-slate-950">
              SEK category totals
            </h2>
            {categoryTotals.length ? (
              <CategoryList totals={categoryTotals} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                No SEK-equivalent category data for this month.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
              Attention
            </p>
            <h2 className="text-2xl font-black text-slate-950">
              Rows blocking clean export
            </h2>
          </div>
          {review.length ? (
            <ReceiptTable receipts={review.slice(0, 50)} />
          ) : (
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8 text-center font-bold text-emerald-900">
              No duplicate or review rows for {month}.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
