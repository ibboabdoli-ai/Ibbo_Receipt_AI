import Link from "next/link";
import { ReceiptTable } from "../../components/receipt-table";
import { StatCard } from "../../components/stat-card";
import {
  getReceiptFacets,
  listReceipts,
  parseReceiptFilters,
} from "../../lib/receipt-store";
import { formatCurrency, getSekEquivalentTotal } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ReceiptsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function toUrlSearchParams(
  values: Record<string, string | string[] | undefined>,
) {
  const result = new URLSearchParams();

  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) {
      if (value[0]) result.set(key, value[0]);
    } else if (value) {
      result.set(key, value);
    }
  }

  return result;
}

function pageUrl(params: URLSearchParams, page: number) {
  const next = new URLSearchParams(params);
  next.set("page", String(page));
  return `/receipts?${next.toString()}`;
}

export default async function ReceiptsPage({
  searchParams,
}: ReceiptsPageProps) {
  const raw = await searchParams;
  const urlParams = toUrlSearchParams(raw);
  const filters = parseReceiptFilters(urlParams);
  const [result, facets] = await Promise.all([
    listReceipts(filters),
    getReceiptFacets(),
  ]);
  const totalSek = getSekEquivalentTotal(result.receipts);
  const attention = result.receipts.filter(
    (receipt) =>
      receipt.status === "needs_review" ||
      receipt.approval_status === "pending",
  ).length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
            Receipts
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            Searchable receipt register
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Filter by month, workflow, currency, category, and archive state.
            Select multiple rows for bulk approval or archiving.
          </p>
        </div>
        <Link
          className="rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white"
          href="/receipts/new"
        >
          Upload new
        </Link>
      </section>

      <form
        className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft md:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <label className="grid gap-2 text-sm font-bold text-slate-700 lg:col-span-2">
          Search
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 font-medium text-slate-950"
            defaultValue={filters.q}
            name="q"
            placeholder="Merchant, invoice, OCR, notes"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Month
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.month}
            name="month"
            type="month"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Type
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.expenseType || "all"}
            name="type"
          >
            <option value="all">All types</option>
            <option value="business">Business</option>
            <option value="private">Private</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Processing
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.status || "all"}
            name="status"
          >
            <option value="all">All statuses</option>
            <option value="processed">Processed</option>
            <option value="needs_review">Needs review</option>
            <option value="failed">Failed</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Approval
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.approval || "all"}
            name="approval"
          >
            <option value="all">All approvals</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Currency
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.currency || "ALL"}
            name="currency"
          >
            <option value="ALL">All currencies</option>
            {facets.currencies.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Category
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.category || "all"}
            name="category"
          >
            <option value="all">All categories</option>
            {facets.categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Archive
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.archive || "active"}
            name="archive"
          >
            <option value="active">Active only</option>
            <option value="archived">Archived only</option>
            <option value="all">Active and archived</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Sort
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={filters.sort || "date_desc"}
            name="sort"
          >
            <option value="date_desc">Newest receipt date</option>
            <option value="date_asc">Oldest receipt date</option>
            <option value="amount_desc">Highest amount</option>
            <option value="amount_asc">Lowest amount</option>
            <option value="merchant_asc">Merchant A–Z</option>
            <option value="created_desc">Recently added</option>
          </select>
        </label>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end lg:col-span-2">
          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
            type="submit"
          >
            Apply filters
          </button>
          <a
            className="rounded-2xl border border-slate-200 px-5 py-3 text-center font-black text-slate-700"
            href="/receipts"
          >
            Reset
          </a>
        </div>
      </form>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          helper="All rows matching the current filters."
          label="Matching receipts"
          value={`${result.total}`}
        />
        <StatCard
          helper={`Page ${result.page} of ${result.totalPages}.`}
          label="Current page"
          value={`${result.receipts.length}`}
        />
        <StatCard
          helper="Known SEK equivalent on the current page."
          label="Page total"
          tone="emerald"
          value={formatCurrency(totalSek)}
        />
        <StatCard
          helper="Pending approval or manual review on this page."
          label="Attention"
          tone="amber"
          value={`${attention}`}
        />
      </section>

      {result.receipts.length ? (
        <ReceiptTable enableBulkActions receipts={result.receipts} />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No receipts match the selected filters.
        </div>
      )}

      <nav
        aria-label="Receipt pagination"
        className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-soft"
      >
        {result.page > 1 ? (
          <a
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-black text-slate-700"
            href={pageUrl(urlParams, result.page - 1)}
          >
            Previous
          </a>
        ) : (
          <span />
        )}
        <p className="text-sm font-bold text-slate-500">
          Page {result.page} / {result.totalPages}
        </p>
        {result.page < result.totalPages ? (
          <a
            className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-black text-white"
            href={pageUrl(urlParams, result.page + 1)}
          >
            Next
          </a>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
