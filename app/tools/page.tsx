const tools = [
  ["Dashboard", "/", "Current-month overview with currency-safe totals."],
  ["All receipts", "/receipts", "Search, filter, sort, approve, archive, and review receipts."],
  ["Upload", "/receipts/new", "Upload an image or PDF and extract accounting data with AI."],
  ["Review queue", "/review", "Resolve uncertain, pending, and duplicate records."],
  ["Business", "/business", "Business expenses and accounting preparation."],
  ["Private", "/private", "Private costs kept outside bookkeeping exports."],
  ["Reports", "/reports", "Monthly category, currency, VAT, and review summaries."],
  ["Data quality", "/quality", "See blockers affecting export reliability."],
  ["Clean receipts", "/clean", "Approved, processed, non-duplicate rows."],
  ["Bookkeeping", "/bookkeeping", "Strict bookkeeping-ready receipt list."],
  ["Export", "/export", "Download filtered CSV, Excel, clean CSV, or SIE."],
] as const;

export default function ToolsPage() {
  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Tools</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Control center</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Every operational view in one place. The main navigation stays compact on mobile.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map(([title, href, description]) => (
          <a
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
            href={href}
            key={href}
          >
            <p className="text-xl font-black text-slate-950">{title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            <p className="mt-4 text-sm font-black text-slate-950 underline">Open</p>
          </a>
        ))}
      </section>
    </div>
  );
}
