import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CleanReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  expenseType: string;
  status: string;
  confidence: number;
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

function normalizeConfidence(value: unknown) {
  const confidence = toNumber(value, 0);
  if (confidence > 1) return confidence / 100;
  return confidence;
}

function isCleanReceipt(receipt: CleanReceipt) {
  const merchant = receipt.merchant.toLowerCase();
  const category = receipt.category.toLowerCase();

  return (
    !merchant.includes("test") &&
    !merchant.includes("uploaded receipt") &&
    !category.includes("unknown") &&
    receipt.expenseType !== "unknown" &&
    receipt.status !== "needs_review" &&
    receipt.amount > 0 &&
    receipt.confidence >= 0.7
  );
}

async function getReceipts(): Promise<CleanReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT id, date, merchant, amount, category, expense_type, status, confidence FROM receipts ORDER BY created_at DESC LIMIT 200",
  );

  return result.rows.map((row) => ({
    id: toText(row.id, "unknown"),
    date: toText(row.date, new Date().toISOString().slice(0, 10)),
    merchant: toText(row.merchant, "Unknown merchant"),
    amount: toNumber(row.amount),
    category: toText(row.category, "Unknown"),
    expenseType: toText(row.expense_type, "unknown"),
    status: toText(row.status, "processed"),
    confidence: normalizeConfidence(row.confidence),
  }));
}

export default async function CleanPage() {
  let receipts: CleanReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getReceipts();
  } catch (error) {
    console.error("Clean page failed", error);
    errorMessage = "Could not load clean receipt data from Turso.";
  }

  const cleanReceipts = receipts.filter(isCleanReceipt);
  const hiddenReceipts = receipts.length - cleanReceipts.length;
  const totalAmount = cleanReceipts.reduce((total, receipt) => total + receipt.amount, 0);
  const businessAmount = cleanReceipts
    .filter((receipt) => receipt.expenseType === "business")
    .reduce((total, receipt) => total + receipt.amount, 0);
  const privateAmount = cleanReceipts
    .filter((receipt) => receipt.expenseType === "private")
    .reduce((total, receipt) => total + receipt.amount, 0);

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Clean</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Clean receipts</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          A clean view that hides test rows, fallback uploads, unknown rows, zero amounts, low-confidence rows, and receipts needing review.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Clean total</p>
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
          <p className="text-sm font-semibold text-slate-500">Hidden rows</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{hiddenReceipts}</p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {cleanReceipts.length > 0 ? (
        <section className="space-y-4">
          {cleanReceipts.map((receipt) => (
            <article key={receipt.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{receipt.merchant}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.category} · {receipt.expenseType} · {receipt.status} · {Math.round(receipt.confidence * 100)}% confidence
                  </p>
                </div>
                <div className="flex flex-col gap-3 md:items-end">
                  <p className="text-2xl font-black text-slate-950">{formatCurrency(receipt.amount)}</p>
                  <a className="rounded-2xl bg-slate-950 px-5 py-3 text-center text-sm font-black text-white" href={`/receipts/${receipt.id}`}>
                    Open review
                  </a>
                </div>
              </div>
            </article>
          ))}
        </section>
      ) : (
        <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center text-slate-600">
          No clean receipts found yet.
        </div>
      )}
    </div>
  );
}
