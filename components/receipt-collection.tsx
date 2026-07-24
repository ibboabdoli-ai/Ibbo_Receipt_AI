import { listReceipts, type ReceiptListFilters } from "../lib/receipt-store";
import { formatCurrency, getSekEquivalentTotal } from "../lib/receipts";
import { ReceiptTable } from "./receipt-table";
import { StatCard } from "./stat-card";

type ReceiptCollectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  filters: ReceiptListFilters;
  emptyMessage: string;
};

export async function ReceiptCollection({
  eyebrow,
  title,
  description,
  filters,
  emptyMessage,
}: ReceiptCollectionProps) {
  const result = await listReceipts({
    ...filters,
    page: 1,
    pageSize: 500,
  });
  const totalSek = getSekEquivalentTotal(result.receipts);
  const reviewCount = result.receipts.filter(
    (receipt) =>
      receipt.status === "needs_review" ||
      receipt.approval_status === "pending",
  ).length;

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
          {title}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
          {description}
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <StatCard
          helper="Rows matching this view."
          label="Receipts"
          value={`${result.total}`}
        />
        <StatCard
          helper="Only values with a known SEK equivalent."
          label="SEK equivalent"
          tone="emerald"
          value={formatCurrency(totalSek)}
        />
        <StatCard
          helper="Pending approval or manual review."
          label="Attention"
          tone="amber"
          value={`${reviewCount}`}
        />
      </section>

      {result.receipts.length ? (
        <ReceiptTable receipts={result.receipts} />
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
