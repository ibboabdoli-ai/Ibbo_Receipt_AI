import { getReceiptFacets } from "../../lib/receipt-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExportPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function queryString(
  params: Record<string, string | string[] | undefined>,
  overrides: Record<string, string> = {},
) {
  const result = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const normalized = first(value);
    if (normalized) result.set(key, normalized);
  }

  for (const [key, value] of Object.entries(overrides)) {
    result.set(key, value);
  }

  result.delete("page");
  return result.toString();
}

export default async function ExportPage({
  searchParams,
}: ExportPageProps) {
  const params = await searchParams;
  const facets = await getReceiptFacets();
  const query = queryString(params);
  const cleanQuery = queryString(params, {
    clean: "1",
    approval: "approved",
    status: "processed",
  });
  const sieQuery = queryString(params, {
    clean: "1",
    approval: "approved",
    status: "processed",
    type: "business",
  });

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          Export
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          Controlled bookkeeping export
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Filter the dataset before downloading. Clean exports include only
          processed and approved rows. CSV values are protected against Excel
          formula injection.
        </p>
      </section>

      <form
        className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:grid-cols-2 lg:grid-cols-4"
        method="get"
      >
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Month
          <input
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={first(params.month)}
            name="month"
            type="month"
          />
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Type
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={first(params.type) || "all"}
            name="type"
          >
            <option value="all">All types</option>
            <option value="business">Business</option>
            <option value="private">Private</option>
            <option value="unknown">Unknown</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Status
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={first(params.status) || "all"}
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
            defaultValue={first(params.approval) || "all"}
            name="approval"
          >
            <option value="all">All approvals</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Currency
          <select
            className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950"
            defaultValue={first(params.currency) || "ALL"}
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
            defaultValue={first(params.category) || "all"}
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

        <div className="flex items-end gap-2 md:col-span-2">
          <button
            className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white"
            type="submit"
          >
            Apply filters
          </button>
          <a
            className="rounded-2xl border border-slate-200 px-5 py-3 font-black text-slate-700"
            href="/export"
          >
            Reset
          </a>
        </div>
      </form>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <a
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
          href={`/api/receipts/export?${query}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
            Full data
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">CSV</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Download the exact filtered dataset for inspection.
          </p>
        </a>

        <a
          className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft transition hover:-translate-y-0.5"
          href={`/api/receipts/export-xlsx?${query}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
            Spreadsheet
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">Excel XLSX</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Structured workbook with all accounting fields.
          </p>
        </a>

        <a
          className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-soft transition hover:-translate-y-0.5"
          href={`/api/receipts/export-clean?${cleanQuery}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Approved only
          </p>
          <h2 className="mt-2 text-2xl font-black text-emerald-950">
            Clean CSV
          </h2>
          <p className="mt-3 text-sm leading-6 text-emerald-900">
            Excludes review, rejected, duplicate, and incomplete rows.
          </p>
        </a>

        <a
          className="rounded-[2rem] border border-sky-200 bg-sky-50 p-6 shadow-soft transition hover:-translate-y-0.5"
          href={`/api/receipts/export-xlsx?${cleanQuery}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-700">
            Approved only
          </p>
          <h2 className="mt-2 text-2xl font-black text-sky-950">
            Clean Excel
          </h2>
          <p className="mt-3 text-sm leading-6 text-sky-900">
            Approved rows prepared for an accountant.
          </p>
        </a>

        <a
          className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-soft transition hover:-translate-y-0.5"
          href={`/api/receipts/export-sie?${sieQuery}`}
        >
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-amber-700">
            Draft accounting file
          </p>
          <h2 className="mt-2 text-2xl font-black text-amber-950">SIE4</h2>
          <p className="mt-3 text-sm leading-6 text-amber-900">
            Approved business receipts with SEK values. Verify BAS accounts
            with an accountant before import.
          </p>
        </a>
      </section>
    </div>
  );
}
