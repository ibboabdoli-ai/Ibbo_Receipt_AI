import type { Receipt } from "./receipts";
import {
  listReceipts,
  parseReceiptFilters,
  type ReceiptListFilters,
} from "./receipt-store";

export const exportColumns = [
  "id",
  "date",
  "due_date",
  "merchant",
  "invoice_number",
  "supplier_org_number",
  "supplier_vat_number",
  "ocr_reference",
  "amount",
  "currency",
  "exchange_rate",
  "amount_sek",
  "net_amount",
  "vat_amount",
  "vat_rate",
  "deductible_vat",
  "vat_country",
  "category",
  "expense_type",
  "account_code",
  "payment_account",
  "cost_center",
  "project_code",
  "payment_method",
  "confidence",
  "status",
  "approval_status",
  "duplicate_of",
  "notes",
  "file_name",
  "created_at",
  "updated_at",
] as const;

export function exportFiltersFromUrl(searchParams: URLSearchParams) {
  const parsed = parseReceiptFilters(searchParams);
  const clean = searchParams.get("clean") === "1";

  return {
    ...parsed,
    page: 1,
    pageSize: 5000,
    cleanOnly: clean,
  } satisfies ReceiptListFilters;
}

export async function getExportReceipts(searchParams: URLSearchParams) {
  const result = await listReceipts(exportFiltersFromUrl(searchParams));
  return result.receipts;
}

export function receiptToExportRow(receipt: Receipt) {
  return {
    id: receipt.id,
    date: receipt.date,
    due_date: receipt.due_date,
    merchant: receipt.merchant,
    invoice_number: receipt.invoice_number,
    supplier_org_number: receipt.supplier_org_number,
    supplier_vat_number: receipt.supplier_vat_number,
    ocr_reference: receipt.ocr_reference,
    amount: receipt.amount,
    currency: receipt.currency,
    exchange_rate: receipt.exchange_rate,
    amount_sek: receipt.amount_sek,
    net_amount: receipt.net_amount,
    vat_amount: receipt.vat_amount,
    vat_rate: receipt.vat_rate,
    deductible_vat: receipt.deductible_vat,
    vat_country: receipt.vat_country,
    category: receipt.category,
    expense_type: receipt.expense_type,
    account_code: receipt.account_code,
    payment_account: receipt.payment_account,
    cost_center: receipt.cost_center,
    project_code: receipt.project_code,
    payment_method: receipt.payment_method,
    confidence: Math.round(receipt.confidence * 100),
    status: receipt.status,
    approval_status: receipt.approval_status,
    duplicate_of: receipt.duplicate_of,
    notes: receipt.notes,
    file_name: receipt.file_name,
    created_at: receipt.created_at,
    updated_at: receipt.updated_at,
  };
}

function spreadsheetSafe(value: unknown) {
  if (value === null || value === undefined) return "";

  const text = String(value).replace(/\r?\n/g, " ");
  if (/^[=+\-@]/.test(text.trimStart())) {
    return `'${text}`;
  }

  return text;
}

function csvCell(value: unknown) {
  const text = spreadsheetSafe(value);
  const escaped = text.replace(/"/g, '""');

  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }

  return escaped;
}

export function receiptsToCsv(receipts: Receipt[]) {
  const header = exportColumns.join(",");
  const rows = receipts.map((receipt) => {
    const row = receiptToExportRow(receipt);
    return exportColumns.map((column) => csvCell(row[column])).join(",");
  });

  return `\uFEFF${[header, ...rows].join("\n")}\n`;
}

function sieQuote(value: string) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function sieNumber(value: number) {
  return (Math.round(value * 100) / 100).toFixed(2);
}

export function receiptsToSie(receipts: Receipt[]) {
  const ready = receipts.filter(
    (receipt) =>
      receipt.expense_type === "business" &&
      receipt.approval_status === "approved" &&
      receipt.status === "processed" &&
      !receipt.archived_at &&
      !receipt.duplicate_of &&
      receipt.amount_sek !== null &&
      receipt.amount_sek > 0,
  );

  const generated = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const accountNames = new Map<string, string>([
    ["1930", "Företagskonto"],
    ["2641", "Debiterad ingående moms"],
    ["6990", "Övriga externa kostnader"],
  ]);

  for (const receipt of ready) {
    accountNames.set(
      receipt.account_code || "6990",
      `Expense: ${receipt.category || "Other"}`,
    );
    accountNames.set(receipt.payment_account || "1930", "Payment account");
  }

  const lines = [
    "#FLAGGA 0",
    '#PROGRAM "Ibbo Receipt AI" "0.2.0"',
    "#FORMAT UTF-8",
    `#GEN ${generated}`,
    "#SIETYP 4",
    '#FNAMN "Ibbo Receipt AI export"',
    "#RAR 0 20260101 20261231",
  ];

  for (const [account, name] of accountNames) {
    lines.push(`#KONTO ${account} ${sieQuote(name)}`);
  }

  ready.forEach((receipt, index) => {
    const gross = receipt.amount_sek ?? 0;
    const vat =
      receipt.deductible_vat ??
      (receipt.currency.toUpperCase() === "SEK" ? receipt.vat_amount : null) ??
      0;
    const net = Math.max(0, gross - vat);
    const expenseAccount = receipt.account_code || "6990";
    const paymentAccount = receipt.payment_account || "1930";
    const voucher = `R${String(index + 1).padStart(4, "0")}`;
    const description = `${receipt.merchant}${
      receipt.invoice_number ? ` ${receipt.invoice_number}` : ""
    }`;

    lines.push(
      `#VER "" ${sieQuote(voucher)} ${receipt.date.replaceAll("-", "")} ${sieQuote(description)}`,
      "{",
      `#TRANS ${expenseAccount} {} ${sieNumber(net)} ${sieQuote(description)}`,
    );

    if (vat > 0) {
      lines.push(
        `#TRANS 2641 {} ${sieNumber(vat)} ${sieQuote("Input VAT")}`,
      );
    }

    lines.push(
      `#TRANS ${paymentAccount} {} ${sieNumber(-gross)} ${sieQuote(description)}`,
      "}",
    );
  });

  return {
    content: `${lines.join("\r\n")}\r\n`,
    included: ready.length,
  };
}
