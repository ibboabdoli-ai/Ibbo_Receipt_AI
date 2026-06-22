import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type BookkeepingReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  vatAmount: number;
  category: string;
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

function isBookkeepingReady(row: Record<string, unknown>) {
  const merchant = toText(row.merchant, "").toLowerCase();
  const category = toText(row.category, "Unknown").toLowerCase();
  const expenseType = toText(row.expense_type, "unknown");
  const status = toText(row.status, "processed");
  const amount = toNumber(row.amount);
  const confidence = normalizeConfidence(row.confidence);

  return (
    expenseType === "business" &&
    !merchant.includes("test") &&
    !merchant.includes("uploaded receipt") &&
    !category.includes("unknown") &&
    status !== "needs_review" &&
    amount > 0 &&
    confidence >= 0.7
  );
}

async function getBookkeepingReceipts(): Promise<BookkeepingReceipt[]> {
  await ensureReceiptsTable();

  const result = await db.execute(
    "SELECT id, date, merchant, amount, vat_amount, category, expense_type, status, confidence FROM receipts ORDER BY created_at DESC LIMIT 500",
  );

  return result.rows
    .map((row) => row as unknown as Record<string, unknown>)
    .filter(isBookkeepingReady)
    .map((row) => ({
      id: toText(row.id, "unknown"),
      date: toText(row.date, new Date().toISOString().slice(0, 10)),
      merchant: toText(row.merchant, "Unknown merchant"),
      amount: toNumber(row.amount),
      vatAmount: toNumber(row.vat_amount),
      category: toText(row.category, "Unknown"),
      status: toText(row.status, "processed"),
      confidence: normalizeConfidence(row.confidence),
    }));
}

export default async function BookkeepingPage() {
  let receipts: BookkeepingReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getBookkeepingReceipts();
  } catch (error) {
    console.error("Bookkeeping page failed", error);
    errorMessage = "Could not load bookkeeping-ready receipts from Turso.";
  }

  const totalAmount = receipts.reduce((total, receipt) => total + receipt.amount, 0);
  const totalVat = receipts.reduce((total, receipt) => total + receipt.vatAmount, 0);
  const netAmount = totalAmount - totalVat;

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Bookkeeping</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Bokforing ready</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Clean business receipts that are ready for export review and monthly bokforing preparation.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Gross total</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(totalAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">VAT total</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(totalVat)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Net estimate</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(netAmount)}</p>
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

      {receipts.length > 0 ? (
        <section className="space-y-4">
          {receipts.map((receipt) => (
            <article key={receipt.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{receipt.merchant}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.category} · {receipt.status} · VAT {formatCurrency(receipt.vatAmount)} · {Math.round(receipt.confidence * 100)}% confidence
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
          No bookkeeping-ready business receipts found yet.
        </div>
      )}
    </div>
  );
}
