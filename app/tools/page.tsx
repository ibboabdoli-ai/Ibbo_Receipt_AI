import Link from "next/link";

const tools = [
  {
    title: "Dashboard",
    href: "/",
    description: "Main overview with live receipt totals.",
  },
  {
    title: "Receipts",
    href: "/receipts",
    description: "All saved receipt rows from Turso.",
  },
  {
    title: "Upload",
    href: "/receipts/new",
    description: "Upload a receipt image for AI extraction.",
  },
  {
    title: "Reports",
    href: "/reports",
    description: "Category, business, private, and review summaries.",
  },
  {
    title: "Export",
    href: "/export",
    description: "Download receipt data as CSV.",
  },
  {
    title: "Review Queue",
    href: "/review",
    description: "Receipts that need manual review before export.",
  },
  {
    title: "Business",
    href: "/business",
    description: "Receipts marked as business expenses.",
  },
  {
    title: "Private",
    href: "/private",
    description: "Receipts marked as private expenses.",
  },
  {
    title: "Monthly",
    href: "/monthly",
    description: "Current month overview for receipt totals.",
  },
];

export default function ToolsPage() {
  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Tools</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Control page</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Quick links to receipt tools, reports, review pages, and export pages without changing the main navigation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.href} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg" href={tool.href}>
            <p className="text-xl font-black text-slate-950">{tool.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{tool.description}</p>
            <p className="mt-4 text-sm font-black text-slate-950 underline">Open</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
