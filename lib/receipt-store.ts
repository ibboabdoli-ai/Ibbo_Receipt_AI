import { db, ensureReceiptsTable } from "./db";
import {
  approvalStatuses,
  expenseTypes,
  receiptStatuses,
  type ApprovalStatus,
  type ExpenseType,
  type Receipt,
  type ReceiptStatus,
} from "./receipts";

export const receiptColumns = `
  id, date, merchant, amount, currency, category, expense_type, vat_amount,
  payment_method, confidence, image_url, notes, status, created_at,
  document_type, file_name, mime_type, file_hash, invoice_number,
  supplier_org_number, supplier_vat_number, due_date, net_amount, vat_rate,
  vat_country, ocr_reference, original_currency, exchange_rate, amount_sek,
  account_code, payment_account, cost_center, project_code, deductible_vat,
  approval_status, approved_at, archived_at, duplicate_of, updated_at
`;

export type ArchiveFilter = "active" | "archived" | "all";
export type ReceiptSort =
  | "date_desc"
  | "date_asc"
  | "amount_desc"
  | "amount_asc"
  | "merchant_asc"
  | "created_desc";

export type ReceiptListFilters = {
  q?: string;
  month?: string;
  expenseType?: string;
  status?: string;
  approval?: string;
  currency?: string;
  category?: string;
  archive?: ArchiveFilter;
  sort?: ReceiptSort | string;
  page?: number;
  pageSize?: number;
  reviewOnly?: boolean;
  cleanOnly?: boolean;
  bookkeepingOnly?: boolean;
};

type SqlValue = string | number | null;

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(",", "."));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function nullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = numberValue(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function textValue(value: unknown, fallback = "") {
  return typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;
}

function nullableText(value: unknown) {
  const text = textValue(value);
  return text || null;
}

function normalizeConfidence(value: unknown) {
  const parsed = numberValue(value);
  const percent = parsed <= 1 ? parsed * 100 : parsed;
  return Math.max(0, Math.min(1, percent / 100));
}

function validExpenseType(value: string): ExpenseType {
  return expenseTypes.includes(value as ExpenseType)
    ? (value as ExpenseType)
    : "unknown";
}

function validStatus(value: string): ReceiptStatus {
  return receiptStatuses.includes(value as ReceiptStatus)
    ? (value as ReceiptStatus)
    : "needs_review";
}

function validApproval(value: string): ApprovalStatus {
  return approvalStatuses.includes(value as ApprovalStatus)
    ? (value as ApprovalStatus)
    : "pending";
}

export function toReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: textValue(row.id, "unknown"),
    date: textValue(row.date, new Date().toISOString().slice(0, 10)),
    merchant: textValue(row.merchant, "Unknown merchant"),
    amount: numberValue(row.amount),
    currency: textValue(row.currency, "SEK").toUpperCase(),
    category: textValue(row.category, "Unknown"),
    expense_type: validExpenseType(textValue(row.expense_type, "unknown")),
    vat_amount: nullableNumber(row.vat_amount),
    payment_method: nullableText(row.payment_method),
    confidence: normalizeConfidence(row.confidence),
    image_url: nullableText(row.image_url),
    notes: nullableText(row.notes),
    status: validStatus(textValue(row.status, "needs_review")),
    created_at: textValue(row.created_at, new Date().toISOString()),
    document_type: textValue(row.document_type, "receipt"),
    file_name: nullableText(row.file_name),
    mime_type: nullableText(row.mime_type),
    file_hash: nullableText(row.file_hash),
    invoice_number: nullableText(row.invoice_number),
    supplier_org_number: nullableText(row.supplier_org_number),
    supplier_vat_number: nullableText(row.supplier_vat_number),
    due_date: nullableText(row.due_date),
    net_amount: nullableNumber(row.net_amount),
    vat_rate: nullableNumber(row.vat_rate),
    vat_country: nullableText(row.vat_country),
    ocr_reference: nullableText(row.ocr_reference),
    original_currency: nullableText(row.original_currency),
    exchange_rate: nullableNumber(row.exchange_rate),
    amount_sek: nullableNumber(row.amount_sek),
    account_code: nullableText(row.account_code),
    payment_account: nullableText(row.payment_account),
    cost_center: nullableText(row.cost_center),
    project_code: nullableText(row.project_code),
    deductible_vat: nullableNumber(row.deductible_vat),
    approval_status: validApproval(
      textValue(row.approval_status, "pending"),
    ),
    approved_at: nullableText(row.approved_at),
    archived_at: nullableText(row.archived_at),
    duplicate_of: nullableText(row.duplicate_of),
    updated_at: nullableText(row.updated_at),
  };
}

export function currentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return year && month ? `${year}-${month}` : new Date().toISOString().slice(0, 7);
}

export function normalizeMonth(value: string | null | undefined) {
  return value && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
    ? value
    : currentMonthKey();
}

function sanitizeFilter(value: string | null) {
  return value?.trim().slice(0, 120) || undefined;
}

export function parseReceiptFilters(searchParams: URLSearchParams): ReceiptListFilters {
  const page = Number(searchParams.get("page") || "1");
  const pageSize = Number(searchParams.get("pageSize") || "25");
  const archive = searchParams.get("archive");
  const sort = searchParams.get("sort");

  return {
    q: sanitizeFilter(searchParams.get("q")),
    month: sanitizeFilter(searchParams.get("month")),
    expenseType: sanitizeFilter(searchParams.get("type")),
    status: sanitizeFilter(searchParams.get("status")),
    approval: sanitizeFilter(searchParams.get("approval")),
    currency: sanitizeFilter(searchParams.get("currency"))?.toUpperCase(),
    category: sanitizeFilter(searchParams.get("category")),
    archive:
      archive === "archived" || archive === "all" ? archive : "active",
    sort:
      sort === "date_asc" ||
      sort === "amount_desc" ||
      sort === "amount_asc" ||
      sort === "merchant_asc" ||
      sort === "created_desc"
        ? sort
        : "date_desc",
    page: Number.isFinite(page) ? Math.max(1, Math.floor(page)) : 1,
    pageSize: Number.isFinite(pageSize)
      ? Math.max(1, Math.min(5000, Math.floor(pageSize)))
      : 25,
  };
}

function buildWhere(filters: ReceiptListFilters) {
  const clauses: string[] = [];
  const args: SqlValue[] = [];

  if (filters.archive === "archived") {
    clauses.push("archived_at IS NOT NULL");
  } else if (filters.archive !== "all") {
    clauses.push("archived_at IS NULL");
  }

  if (filters.q) {
    const query = `%${filters.q}%`;
    clauses.push(`(
      merchant LIKE ? OR
      invoice_number LIKE ? OR
      supplier_org_number LIKE ? OR
      ocr_reference LIKE ? OR
      notes LIKE ?
    )`);
    args.push(query, query, query, query, query);
  }

  if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
    clauses.push("date LIKE ?");
    args.push(`${filters.month}%`);
  }

  if (filters.expenseType && filters.expenseType !== "all") {
    clauses.push("expense_type = ?");
    args.push(filters.expenseType);
  }

  if (filters.status && filters.status !== "all") {
    clauses.push("status = ?");
    args.push(filters.status);
  }

  if (filters.approval && filters.approval !== "all") {
    clauses.push("approval_status = ?");
    args.push(filters.approval);
  }

  if (filters.currency && filters.currency !== "ALL") {
    clauses.push("UPPER(currency) = ?");
    args.push(filters.currency.toUpperCase());
  }

  if (filters.category && filters.category !== "all") {
    clauses.push("category = ?");
    args.push(filters.category);
  }

  if (filters.reviewOnly) {
    clauses.push(`(
      status = 'needs_review' OR
      expense_type = 'unknown' OR
      approval_status = 'pending' OR
      duplicate_of IS NOT NULL
    )`);
  }

  if (filters.cleanOnly) {
    clauses.push(`
      status = 'processed'
      AND approval_status = 'approved'
      AND duplicate_of IS NULL
      AND merchant IS NOT NULL
      AND TRIM(merchant) <> ''
      AND date IS NOT NULL
      AND amount > 0
    `);
  }

  if (filters.bookkeepingOnly) {
    clauses.push(`
      status = 'processed'
      AND approval_status = 'approved'
      AND expense_type = 'business'
      AND duplicate_of IS NULL
      AND amount_sek IS NOT NULL
      AND amount_sek > 0
    `);
  }

  return {
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
    args,
  };
}

function orderBy(sort: ReceiptListFilters["sort"]) {
  const sortMap: Record<string, string> = {
    date_desc: "date DESC, created_at DESC",
    date_asc: "date ASC, created_at ASC",
    amount_desc: "COALESCE(amount_sek, amount) DESC",
    amount_asc: "COALESCE(amount_sek, amount) ASC",
    merchant_asc: "merchant COLLATE NOCASE ASC",
    created_desc: "created_at DESC",
  };

  return sortMap[sort || "date_desc"] || sortMap.date_desc;
}

export async function listReceipts(filters: ReceiptListFilters = {}) {
  await ensureReceiptsTable();

  const page = Math.max(1, Math.floor(filters.page || 1));
  const pageSize = Math.max(
    1,
    Math.min(5000, Math.floor(filters.pageSize || 25)),
  );
  const offset = (page - 1) * pageSize;
  const query = buildWhere(filters);

  const [rowsResult, countResult] = await Promise.all([
    db.execute({
      sql: `
        SELECT ${receiptColumns}
        FROM receipts
        ${query.where}
        ORDER BY ${orderBy(filters.sort)}
        LIMIT ? OFFSET ?
      `,
      args: [...query.args, pageSize, offset],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS total FROM receipts ${query.where}`,
      args: query.args,
    }),
  ]);

  const total = numberValue(countResult.rows[0]?.total);
  const receipts = rowsResult.rows.map((row) =>
    toReceipt(row as Record<string, unknown>),
  );

  return {
    receipts,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getReceiptById(id: string) {
  await ensureReceiptsTable();

  const result = await db.execute({
    sql: `SELECT ${receiptColumns} FROM receipts WHERE id = ? LIMIT 1`,
    args: [id],
  });

  const row = result.rows[0] as Record<string, unknown> | undefined;
  return row ? toReceipt(row) : null;
}

export async function getReceiptFacets() {
  await ensureReceiptsTable();

  const [categoryResult, currencyResult] = await Promise.all([
    db.execute(`
      SELECT DISTINCT category
      FROM receipts
      WHERE archived_at IS NULL AND category IS NOT NULL AND TRIM(category) <> ''
      ORDER BY category COLLATE NOCASE
    `),
    db.execute(`
      SELECT DISTINCT UPPER(currency) AS currency
      FROM receipts
      WHERE archived_at IS NULL AND currency IS NOT NULL AND TRIM(currency) <> ''
      ORDER BY currency
    `),
  ]);

  return {
    categories: categoryResult.rows
      .map((row) => textValue(row.category))
      .filter(Boolean),
    currencies: currencyResult.rows
      .map((row) => textValue(row.currency))
      .filter(Boolean),
  };
}
