import { formatCurrency, type CategoryTotal } from "../lib/receipts";

type CategoryListProps = {
  totals: CategoryTotal[];
  currency?: string;
};

export function CategoryList({
  totals,
  currency = "SEK",
}: CategoryListProps) {
  return (
    <div className="space-y-3">
      {totals.map((item) => (
        <article
          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft"
          key={item.category}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-950">{item.category}</h3>
              <p className="mt-1 text-sm text-slate-500">
                {item.count} receipt{item.count === 1 ? "" : "s"}
              </p>
            </div>
            <p className="text-right font-black text-slate-950">
              {formatCurrency(item.amount, currency)}
            </p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-950"
              style={{ width: `${Math.min(100, Math.max(item.percentage, 3))}%` }}
            />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-500">
            {item.percentage.toFixed(1)}% of SEK-equivalent total
          </p>
        </article>
      ))}
    </div>
  );
}
