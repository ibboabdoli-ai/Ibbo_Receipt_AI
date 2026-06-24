export const receiptCategories = [
  "Food / Livsmedel",
  "Restaurant / Café",
  "Car / Parking",
  "Pharmacy / Health",
  "Electronics / Tools",
  "Home / Furniture",
  "Software / Digital",
  "Business / Iboren",
  "Private",
  "Unknown / Needs review"
] as const;

export const receiptStatuses = ["processed", "needs_review", "failed"] as const;
export const expenseTypes = ["private", "business", "unknown"] as const;

export type ReceiptCategory = (typeof receiptCategories)[number];
export type ReceiptStatus = (typeof receiptStatuses)[number];
export type ExpenseType = (typeof expenseTypes)[number];

export type Receipt = {
  id: string;
  date: string;
  merchant: string;
  amount: number;
  currency: "SEK" | "EUR" | "USD" | string;
  category: ReceiptCategory;
  expense_type: ExpenseType;
  vat_amount: number | null;
  payment_method: string | null;
  confidence: number;
  image_url: string | null;
  notes: string | null;
  status: ReceiptStatus;
  created_at: string;
};

export type CategoryTotal = {
  category: ReceiptCategory;
  amount: number;
  count: number;
  percentage: number;
};

export const sampleReceipts: Receipt[] = [
  {
    id: "rec_001",
    date: "2026-06-22",
    merchant: "Maxi ICA Stormarknad",
    amount: 1129,
    currency: "SEK",
    category: "Food / Livsmedel",
    expense_type: "private",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.92,
    image_url: null,
    notes: "Imported from manual dashboard sample.",
    status: "processed",
    created_at: "2026-06-22T12:19:00.000Z"
  },
  {
    id: "rec_002",
    date: "2026-07-09",
    merchant: "NetOnNet",
    amount: 11574,
    currency: "SEK",
    category: "Electronics / Tools",
    expense_type: "unknown",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.86,
    image_url: null,
    notes: "High amount. Review whether private or Iboren business.",
    status: "needs_review",
    created_at: "2026-06-22T12:20:00.000Z"
  },
  {
    id: "rec_003",
    date: "2026-07-01",
    merchant: "PayPal",
    amount: 4840,
    currency: "SEK",
    category: "Unknown / Needs review",
    expense_type: "unknown",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.52,
    image_url: null,
    notes: "PayPal needs source transaction review.",
    status: "needs_review",
    created_at: "2026-06-22T12:21:00.000Z"
  },
  {
    id: "rec_004",
    date: "2026-06-25",
    merchant: "OpenAI",
    amount: 235,
    currency: "SEK",
    category: "Software / Digital",
    expense_type: "business",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.95,
    image_url: null,
    notes: "Potential business software cost.",
    status: "processed",
    created_at: "2026-06-22T12:22:00.000Z"
  },
  {
    id: "rec_005",
    date: "2026-07-06",
    merchant: "Ikea",
    amount: 2474,
    currency: "SEK",
    category: "Home / Furniture",
    expense_type: "unknown",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.88,
    image_url: null,
    notes: "Review if business equipment or private home purchase.",
    status: "needs_review",
    created_at: "2026-06-22T12:23:00.000Z"
  },
  {
    id: "rec_006",
    date: "2026-07-07",
    merchant: "Circle K",
    amount: 1027,
    currency: "SEK",
    category: "Car / Parking",
    expense_type: "private",
    vat_amount: null,
    payment_method: "Klarna •••• 3543",
    confidence: 0.91,
    image_url: null,
    notes: "Fuel or car cost.",
    status: "processed",
    created_at: "2026-06-22T12:24:00.000Z"
  }
];

export function formatCurrency(amount: number, currency = "SEK") {
  const hasDecimals = !Number.isInteger(amount);

  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0
  }).format(amount);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(date));
}

export function getTotalAmount(receipts: Receipt[]) {
  return receipts.reduce((total, receipt) => total + receipt.amount, 0);
}

export function getCategoryTotals(receipts: Receipt[]): CategoryTotal[] {
  const total = getTotalAmount(receipts);
  const byCategory = new Map<ReceiptCategory, { amount: number; count: number }>();

  for (const receipt of receipts) {
    const existing = byCategory.get(receipt.category) ?? { amount: 0, count: 0 };
    byCategory.set(receipt.category, {
      amount: existing.amount + receipt.amount,
      count: existing.count + 1
    });
  }

  return Array.from(byCategory.entries())
    .map(([category, value]) => ({
      category,
      amount: value.amount,
      count: value.count,
      percentage: total === 0 ? 0 : (value.amount / total) * 100
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function getStatusLabel(status: ReceiptStatus) {
  if (status === "processed") return "Processed";
  if (status === "needs_review") return "Needs review";
  return "Failed";
}
