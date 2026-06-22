import Link from "next/link";
import { ReceiptTable } from "../../components/receipt-table";
import { StatCard } from "../../components/stat-card";
import { formatCurrency, getTotalAmount, sampleReceipts } from "../../lib/receipts";

export default function ReceiptsPage() {
  const totalAmount = getTotalAmount(sampleReceipts);
  const needsReview = sampleReceipts.filter((receipt) => receipt.status === "needs_review").length;
  const processed = sampleReceipts.filter((receipt) => receipt.status === "processed").length;

  return (
    <div className="space-y-7">
      <section className="flex flex-col justify-between gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft md:flex-row md:items-center">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Receipts</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Receipt register</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Central table for uploaded or imported receipts. Phase 1 uses sample data until Turso is connected.
          </p>
        </div>
        <Link className="rounded-2xl bg-slate-950 px-5 py-3 text-center font-black text-white" href="/receipts/new">
          Upload new
        </Link>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard helper="Across visible receipt sample." label="Registered total" value={formatCurrency(totalAmount)} />
        <StatCard helper="Ready for reports and export." label="Processed" tone="emerald" value={`${processed}`} />
        <StatCard helper="Needs manual decision." label="Review" tone="rose" value={`${needsReview}`} />
      </section>

      <ReceiptTable receipts={sampleReceipts} />
    </div>
  );
}
