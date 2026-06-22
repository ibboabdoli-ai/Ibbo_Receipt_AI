import { formatCurrency, type CategoryTotal } from "../lib/receipts";

type CategoryListProps = {
  totals: CategoryTotal[];
};

export function CategoryList({ totals }: CategoryListProps) {
  return (
    <div className="space-y-3">
      {totals.map((item) => (
        <article className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft" key={item.category}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-950">{item.category}</h3>
              <p className="mt-1 text-sm text-slate-500">{item.count} receipt{item.count === 1 ? "" : "s"}</p>
            </div>
            <p className="text-right font-black text-slate-950">{formatCurrency(item.amount)}</p>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-slate-950" style={{ width: `${Math.max(item.percentage, 6)}%` }} />
          </div>
          <p className="mt-2 text-xs font-bold text-slate-500">{item.percentage.toFixed(1)}% of current total</p>
        </article>
      ))}
    </div>
  );
}
