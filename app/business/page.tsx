import Link from "next/link";
import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BusinessReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  status: string;
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

async function getBusinessReceipts(): Promise<BusinessReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT id, date, merchant, amount, currency, category, status FROM receipts WHERE expense_type = 'business' ORDER BY created_at DESC LIMIT 100",
  );

  return result.rows.map((row) => ({
    id: toText(row.id, "unknown"),
    date: toText(row.date, new Date().toISOString().slice(0, 10)),
    merchant: toText(row.merchant, "Unknown merchant"),
    amount: toNumber(row.amount),
    currency: toText(row.currency, "SEK"),
    category: toText(row.category, "Unknown"),
    status: toText(row.status, "processed"),
  }));
}

export default async function BusinessPage() {
  let receipts: BusinessReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getBusinessReceipts();
  } catch (error) {
    console.error("Business page failed", error);
    errorMessage = "Could not load business receipts from Turso.";
  }

  const totalAmount = receipts.reduce((total, receipt) => total + receipt.amount, 0);
  const reviewCount = receipts.filter((receipt) => receipt.status !== "processed" || receipt.category.toLowerCase().includes("unknown")).length;

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Business</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Business expenses</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Review receipts marked as business costs before export and bokforing preparation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Business total</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(totalAmount)}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">Total amount marked as business.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Receipts</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{receipts.length}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">Business receipts saved in Turso.</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Needs check</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{reviewCount}</p>
          <p className="mt-4 text-sm leading-6 text-slate-600">Business receipts that still need review.</p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {receipts.length > 0 ? (
        <section className="space-y-4">
          {receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{receipt.merchant}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.category} · {receipt.status}
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-2xl font-black text-slate-950">{formatCurrency(receipt.amount)}</p>
                  <Link className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white" href={`/receipts/${receipt.id}`}>
                    Open review
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No business receipts saved yet.
        </div>
      )}
    </div>
  );
}
