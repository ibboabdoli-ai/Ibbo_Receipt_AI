type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  tone?: "slate" | "amber" | "emerald" | "rose";
};

const toneClasses: Record<NonNullable<StatCardProps["tone"]>, string> = {
  slate: "bg-slate-950 text-white",
  amber: "bg-amber-100 text-amber-950",
  emerald: "bg-emerald-100 text-emerald-950",
  rose: "bg-rose-100 text-rose-950"
};

export function StatCard({ label, value, helper, tone = "slate" }: StatCardProps) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{value}</p>
        </div>
        <span className={"rounded-2xl px-3 py-2 text-xs font-black " + toneClasses[tone]}>
          KPI
        </span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{helper}</p>
    </article>
  );
}
