import Link from "next/link";
import { CategoryList } from "../components/category-list";
import { ReceiptTable } from "../components/receipt-table";
import { StatCard } from "../components/stat-card";
import {
  currentMonthKey,
  listReceipts,
  normalizeMonth,
} from "../lib/receipt-store";
import {
  formatCurrency,
  getCategoryTotalsInSek,
  getCurrencyTotals,
  getMissingExchangeRateCount,
  getSekEquivalentTotal,
} from "../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const month = normalizeMonth(first(params.month) || currentMonthKey());
  const result = await listReceipts({
    month,
    page: 1,
    pageSize: 2000,
    sort: "created_desc",
  });
  const receipts = result.receipts;
  const totalSek = getSekEquivalentTotal(receipts);
  const needsReview = receipts.filter(
    (receipt) =>
      receipt.status === "needs_review" ||
      receipt.approval_status === "pending",
  ).length;
  const approved = receipts.filter(
    (receipt) => receipt.approval_status === "approved",
  ).length;
  const missingFx = getMissingExchangeRateCount(receipts);
  const categoryTotals = getCategoryTotalsInSek(receipts);
  const currencyTotals = getCurrencyTotals(receipts);
  const recentReceipts = receipts.slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-slate-400">
              Production workspace
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Scan, review, approve, and export receipt data.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              Month totals are now date-filtered. Foreign currencies remain
              separate until a SEK exchange rate is confirmed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-2xl bg-white px-5 py-3 text-center font-black text-slate-950"
                href="/receipts/new"
              >
                Upload receipt
              </Link>
              <Link
                className="rounded-2xl border border-white/20 px-5 py-3 text-center font-black text-white"
                href={`/reports?month=${month}`}
              >
                View month report
              </Link>
            </div>
          </div>

          <div className="rounded-[1.5rem] bg-white/10 p-5 ring-1 ring-white/10">
            <form className="flex flex-col gap-3" method="get">
              <label className="text-sm font-semibold text-slate-300" htmlFor="dashboard-month">
                Reporting month
              </label>
              <div className="flex gap-2">
                <input
                  className="min-w-0 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 font-bold text-white"
                  defaultValue={month}
                  id="dashboard-month"
                  name="month"
                  type="month"
                />
                <button
                  className="rounded-xl bg-white px-4 py-2 text-sm font-black text-slate-950"
                  type="submit"
                >
                  Apply
                </button>
              </div>
            </form>
            <p className="mt-5 text-sm font-semibold text-slate-300">
              SEK equivalent
            </p>
            <p className="mt-2 text-5xl font-black">
              {formatCurrency(totalSek)}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/10 p-4">
                <p className="text-slate-300">Needs attention</p>
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
        <StatCard
          helper={`Approved rows for ${month}.`}
          label="Approved"
          tone="emerald"
          value={`${approved}`}
        />
        <StatCard
          helper="Processed or pending rows requiring a decision."
          label="Attention"
          tone="amber"
          value={`${needsReview}`}
        />
        <StatCard
          helper="Foreign-currency rows without a confirmed SEK value."
          label="Missing FX"
          tone={missingFx ? "rose" : "emerald"}
          value={`${missingFx}`}
        />
        <StatCard
          helper="Known SEK-equivalent spend for the selected month."
          label="SEK total"
          value={formatCurrency(totalSek)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Currencies
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Original totals
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {currencyTotals.length ? (
                currencyTotals.map((item) => (
                  <article
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft"
                    key={item.currency}
                  >
                    <p className="text-sm font-bold text-slate-500">
                      {item.count} receipt{item.count === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {formatCurrency(item.amount, item.currency)}
                    </p>
                  </article>
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                  No receipt data for {month}.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-4">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Categories
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                SEK expense split
              </h2>
            </div>
            {categoryTotals.length ? (
              <CategoryList totals={categoryTotals} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                Add SEK values or exchange rates to calculate category totals.
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
                Recent
              </p>
              <h2 className="text-2xl font-black text-slate-950">
                Latest receipts
              </h2>
            </div>
            <Link
              className="text-sm font-black text-slate-950 underline underline-offset-4"
              href={`/receipts?month=${month}`}
            >
              View all
            </Link>
          </div>
          {recentReceipts.length ? (
            <ReceiptTable receipts={recentReceipts} />
          ) : (
            <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
              No receipts saved for {month}.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
