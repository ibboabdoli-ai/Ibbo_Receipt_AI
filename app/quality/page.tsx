import { db, ensureReceiptsTable } from "../../lib/db";
import { formatCurrency } from "../../lib/receipts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type QualityReceipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  category: string;
  expenseType: string;
  status: string;
  confidence: number;
};

type QualityRow = QualityReceipt & {
  issues: string[];
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

function duplicateKey(receipt: QualityReceipt) {
  return `${receipt.date}|${receipt.merchant.toLowerCase()}|${receipt.amount}`;
}

function getIssues(receipt: QualityReceipt, duplicateCount: number) {
  const issues: string[] = [];
  const merchant = receipt.merchant.toLowerCase();
  const category = receipt.category.toLowerCase();

  if (merchant.includes("test")) issues.push("test merchant");
  if (merchant.includes("uploaded receipt")) issues.push("fallback upload");
  if (category.includes("unknown")) issues.push("unknown category");
  if (receipt.expenseType === "unknown") issues.push("unknown type");
  if (receipt.status === "needs_review") issues.push("needs review");
  if (receipt.amount === 0) issues.push("zero amount");
  if (receipt.confidence < 0.7) issues.push("low confidence");
  if (duplicateCount > 1) issues.push("possible duplicate");

  return issues;
}

async function getReceipts(): Promise<QualityReceipt[]> {
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

export default async function QualityPage() {
  let receipts: QualityReceipt[] = [];
  let errorMessage = "";

  try {
    receipts = await getReceipts();
  } catch (error) {
    console.error("Quality page failed", error);
    errorMessage = "Could not load receipt quality data from Turso.";
  }

  const duplicateCounts = new Map<string, number>();
  for (const receipt of receipts) {
    const key = duplicateKey(receipt);
    duplicateCounts.set(key, (duplicateCounts.get(key) ?? 0) + 1);
  }

  const qualityRows: QualityRow[] = receipts
    .map((receipt) => ({
      ...receipt,
      issues: getIssues(receipt, duplicateCounts.get(duplicateKey(receipt)) ?? 0),
    }))
    .filter((receipt) => receipt.issues.length > 0);

  const affectedAmount = qualityRows.reduce((total, receipt) => total + receipt.amount, 0);
  const reviewRows = qualityRows.filter((receipt) => receipt.status === "needs_review" || receipt.expenseType === "unknown");
  const duplicateRows = qualityRows.filter((receipt) => receipt.issues.includes("possible duplicate"));

  return (
    <div className="space-y-7">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft sm:p-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Quality</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Data quality check</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          Find test rows, unknown receipts, zero amounts, low confidence rows, and possible duplicates before cleanup.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Flagged rows</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{qualityRows.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Affected amount</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{formatCurrency(affectedAmount)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Review rows</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{reviewRows.length}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
          <p className="text-sm font-semibold text-slate-500">Duplicates</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{duplicateRows.length}</p>
        </div>
      </section>

      {errorMessage ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-bold text-rose-700">
          {errorMessage}
        </div>
      ) : null}

      {qualityRows.length > 0 ? (
        <section className="space-y-4">
          {qualityRows.map((receipt) => (
            <article key={receipt.id} className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-500">{receipt.date}</p>
                  <h2 className="mt-1 text-2xl font-black text-slate-950">{receipt.merchant}</h2>
                  <p className="mt-2 text-sm text-slate-600">
                    {receipt.category} · {receipt.expenseType} · {receipt.status} · {Math.round(receipt.confidence * 100)}% confidence
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {receipt.issues.map((issue) => (
                      <span key={issue} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-950">
                        {issue}
                      </span>
                    ))}
                  </div>
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
          No quality issues found in the latest receipt rows.
        </div>
      )}
    </div>
  );
}
