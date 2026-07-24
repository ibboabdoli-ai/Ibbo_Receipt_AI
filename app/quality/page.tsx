import { listReceipts } from "../../lib/receipt-store";
import { formatCurrency, getMissingExchangeRateCount, getSekEquivalentTotal } from "../../lib/receipts";
import { StatCard } from "../../components/stat-card";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function QualityPage() {
  const result = await listReceipts({ archive: "active", page: 1, pageSize: 5000 });
  const receipts = result.receipts;
  const duplicates = receipts.filter((receipt) => receipt.duplicate_of).length;
  const pending = receipts.filter((receipt) => receipt.approval_status === "pending").length;
  const unknownType = receipts.filter((receipt) => receipt.expense_type === "unknown").length;
  const failedOrReview = receipts.filter((receipt) => receipt.status !== "processed").length;
  const missingFx = getMissingExchangeRateCount(receipts);
  const missingInvoiceData = receipts.filter(
    (receipt) => receipt.document_type === "invoice" && !receipt.invoice_number,
  ).length;
  const bookkeepingReady = receipts.filter(
    (receipt) =>
      receipt.expense_type === "business" &&
      receipt.approval_status === "approved" &&
      receipt.status === "processed" &&
      !receipt.duplicate_of &&
      receipt.amount_sek !== null &&
      receipt.amount_sek > 0,
  ).length;
  const attention = [
    { label: "Pending approval", value: pending, href: "/receipts?approval=pending" },
    { label: "Needs extraction review", value: failedOrReview, href: "/review" },
    { label: "Unknown expense type", value: unknownType, href: "/receipts?type=unknown" },
    { label: "Possible duplicates", value: duplicates, href: "/review" },
    { label: "Missing exchange rate", value: missingFx, href: "/receipts?currency=EUR" },
    { label: "Invoices missing number", value: missingInvoiceData, href: "/receipts?q=" },
  ];

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Quality</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Data quality control</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          Check the blockers that can make monthly totals or accounting exports unreliable.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard helper="Active rows in the database." label="Active receipts" value={`${receipts.length}`} />
        <StatCard helper="Known values converted or entered in SEK." label="Known SEK value" tone="emerald" value={formatCurrency(getSekEquivalentTotal(receipts))} />
        <StatCard helper="Meets the strict bookkeeping export rules." label="Bookkeeping ready" tone="emerald" value={`${bookkeepingReady}`} />
        <StatCard helper="Total unresolved quality checks." label="Open checks" tone="amber" value={`${attention.reduce((sum, item) => sum + item.value, 0)}`} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {attention.map((item) => (
          <a
            className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg"
            href={item.href}
            key={item.label}
          >
            <p className="text-sm font-bold uppercase tracking-[0.14em] text-slate-400">Check</p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <h2 className="text-xl font-black text-slate-950">{item.label}</h2>
              <p className="text-3xl font-black text-slate-950">{item.value}</p>
            </div>
          </a>
        ))}
      </section>
    </div>
  );
}
