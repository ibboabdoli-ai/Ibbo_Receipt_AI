export const receiptCategories = [
  "Food",
  "Restaurant",
  "Car",
  "Health",
  "Tools",
  "Home",
  "Software",
  "Office",
  "Travel",
  "Business",
  "Private",
  "Unknown",
] as const;

export const receiptStatuses = [
  "processed",
  "needs_review",
  "failed",
] as const;

export const approvalStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;

export const expenseTypes = ["private", "business", "unknown"] as const;

export type ReceiptStatus = (typeof receiptStatuses)[number];
export type ApprovalStatus = (typeof approvalStatuses)[number];
export type ExpenseType = (typeof expenseTypes)[number];

export type Receipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: string;
  category: string;
  expense_type: ExpenseType;
  vat_amount: number | null;
  payment_method: string | null;
  confidence: number;
  image_url: string | null;
  notes: string | null;
  status: ReceiptStatus;
  created_at: string;
  document_type: string;
  file_name: string | null;
  mime_type: string | null;
  file_hash: string | null;
  invoice_number: string | null;
  supplier_org_number: string | null;
  supplier_vat_number: string | null;
  due_date: string | null;
  net_amount: number | null;
  vat_rate: number | null;
  vat_country: string | null;
  ocr_reference: string | null;
  original_currency: string | null;
  exchange_rate: number | null;
  amount_sek: number | null;
  account_code: string | null;
  payment_account: string | null;
  cost_center: string | null;
  project_code: string | null;
  deductible_vat: number | null;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  archived_at: string | null;
  duplicate_of: string | null;
  updated_at: string | null;
};

export type CategoryTotal = {
  category: string;
  amount: number;
  count: number;
  percentage: number;
};

export type CurrencyTotal = {
  currency: string;
  amount: number;
  count: number;
};

export const sampleReceipts: Receipt[] = [];

export function formatCurrency(amount: number, currency = "SEK") {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency =
    /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : "SEK";
  const hasDecimals = !Number.isInteger(safeAmount);

  try {
    return new Intl.NumberFormat("sv-SE", {
      style: "currency",
      currency: normalizedCurrency,
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${safeAmount.toFixed(hasDecimals ? 2 : 0)} ${normalizedCurrency}`;
  }
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "Not set";

  const parsed = new Date(`${date.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;

  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Stockholm",
  }).format(parsed);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Stockholm",
  }).format(parsed);
}

export function getCurrencyTotals(receipts: Receipt[]): CurrencyTotal[] {
  const grouped = new Map<string, CurrencyTotal>();

  for (const receipt of receipts) {
    const currency = (receipt.currency || "SEK").toUpperCase();
    const current = grouped.get(currency) ?? {
      currency,
      amount: 0,
      count: 0,
    };

    current.amount += receipt.amount;
    current.count += 1;
    grouped.set(currency, current);
  }

  return Array.from(grouped.values()).sort((left, right) =>
    left.currency.localeCompare(right.currency),
  );
}

export function getSekEquivalentTotal(receipts: Receipt[]) {
  return receipts.reduce((total, receipt) => {
    if (receipt.amount_sek !== null && Number.isFinite(receipt.amount_sek)) {
      return total + receipt.amount_sek;
    }

    if (receipt.currency.toUpperCase() === "SEK") {
      return total + receipt.amount;
    }

    return total;
  }, 0);
}

export function getMissingExchangeRateCount(receipts: Receipt[]) {
  return receipts.filter(
    (receipt) =>
      receipt.currency.toUpperCase() !== "SEK" &&
      (receipt.amount_sek === null || receipt.exchange_rate === null),
  ).length;
}

export function getCategoryTotalsInSek(receipts: Receipt[]): CategoryTotal[] {
  const usable = receipts
    .map((receipt) => ({
      category: receipt.category || "Unknown",
      amount:
        receipt.amount_sek ??
        (receipt.currency.toUpperCase() === "SEK" ? receipt.amount : null),
    }))
    .filter(
      (item): item is { category: string; amount: number } =>
        item.amount !== null && Number.isFinite(item.amount),
    );

  const total = usable.reduce((sum, item) => sum + item.amount, 0);
  const grouped = new Map<string, { amount: number; count: number }>();

  for (const item of usable) {
    const current = grouped.get(item.category) ?? { amount: 0, count: 0 };
    current.amount += item.amount;
    current.count += 1;
    grouped.set(item.category, current);
  }

  return Array.from(grouped.entries())
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      percentage: total === 0 ? 0 : (value.amount / total) * 100,
    }))
    .sort((left, right) => right.amount - left.amount);
}

export function getStatusLabel(status: ReceiptStatus) {
  if (status === "processed") return "Processed";
  if (status === "needs_review") return "Needs review";
  return "Failed";
}

export function getApprovalLabel(status: ApprovalStatus) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Rejected";
  return "Pending";
}

export function isBookkeepingReady(receipt: Receipt) {
  return (
    !receipt.archived_at &&
    receipt.status === "processed" &&
    receipt.approval_status === "approved" &&
    receipt.expense_type === "business" &&
    receipt.amount > 0 &&
    Boolean(receipt.date) &&
    Boolean(receipt.merchant) &&
    receipt.amount_sek !== null &&
    !receipt.duplicate_of
  );
}
