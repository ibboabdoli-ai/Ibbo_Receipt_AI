import Link from "next/link";
import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type MonthlyReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  expenseType: string;
  status: string;
};

type CategorySummary = {
  category: string;
  amount: number;
  count: number;
};

function toNumber(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function toText(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function getMonthKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

async function getMonthlyReceipts(monthKey: string): Promise<MonthlyReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute({
    sql: "SELECT id, date, merchant, amount, category, expense_type, status FROM receipts WHERE date LIKE ? ORDER BY date DESC LIMIT 500",
    args: [`${monthKey}%`],
  });

  return result.rows.map((row) => ({
    id: toText(row.id, "unknown"),
    date: toText(row.date, new Date().toISOString().slice(0, 10)),
    merchant: toText(row.merchant, "Unknown merchant"),
    amount: toNumber(row.amount),
    category: toText(row.category, "Unknown"),
    expenseType: toText(row.expense_type, "unknown"),
    status: toText(row.status, "processed"),
  }));
}

function getCategorySummary(receipts: MonthlyReceipt[]) {
  const byCategory = new Map<string, CategorySummary>();

  for (const receipt of receipts) {
    const existing = byCategory.get(receipt.category) ?? { category: receipt.category, amount: 0, count: 0 };
    byCategory.set(receipt.category, {
      category: receipt.category,
      amount: existing.amount + receipt.amount,
      count: existing.count + 1,
    });
  }

  return Array.from(byCategory.values()).sort((a, b) => b.amount - a.amount);
}

export default async function MonthlyPage() {
  const monthKey = getMonthKey();
  let receipts: MonthlyReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getMonthlyReceipts(monthKey);
  } catch (error) {
    console.error("Monthly page failed", error);
    errorMessage = "Could not load monthly receipts from Turso.";
  }

  const totalAmount = receipts.reduce((total, receipt) => total + receipt.amount, 0);
  const businessAmount = receipts
    .filter((receipt) => receipt.expenseType === "business")
    .reduce((total, receipt) => total + receipt.amount, 0);
  const privateAmount = receipts
    .filter((receipt) => receipt.expenseType === "private")
    .reduce((total, receipt) => total + receipt.amount, 0);
  const reviewCount = receipts.filter(
    (receipt) => receipt.status === "needs_review" || receipt.category.toLowerCase().includes("unknown") || receipt.expenseType === "unknown",
  ).length;
  const categorySummary = getCategorySummary(receipts);

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Monthly</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Monthly overview</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Current month summary for saved receipt dates matching {monthKey}. Use this before export and bokforing preparation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Total</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Business</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(businessAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Private</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(privateAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Review</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{reviewCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Receipts</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{receipts.length}</p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-slate-950">Category totals</h2>
          {categorySummary.length > 0 ? (
            <div className="mt-5 space-y-3">
              {categorySummary.map((category) => (
                <div key={category.category} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-slate-950">{category.category}</p>
                      <p className="text-sm text-slate-500">{category.count} receipts</p>
                    </div>
                    <p className="font-black text-slate-950">{formatCurrency(category.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-600">No receipts found for this month.</p>
          )}
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-black text-slate-950">Monthly receipts</h2>
          {receipts.length > 0 ? (
            <div className="mt-5 space-y-3">
              {receipts.map((receipt) => (
                <div key={receipt.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                      <p className="font-black text-slate-950">{receipt.merchant}</p>
                      <p className="text-sm text-slate-600">
                        {receipt.category} · {receipt.expenseType} · {receipt.status}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 md:items-end">
                      <p className="font-black text-slate-950">{formatCurrency(receipt.amount)}</p>
                      <Link className="text-sm font-black text-slate-950 underline" href={`/receipts/${receipt.id}`}>
                        Open review
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-600">No monthly receipt rows to show.</p>
          )}
        </div>
      </section>
    </div>
  );
}
