import { describe, expect, it } from "vitest";
import {
  getCurrencyTotals,
  getMissingExchangeRateCount,
  getSekEquivalentTotal,
  type Receipt,
} from "../lib/receipts";

function receipt(overrides: Partial<Receipt>): Receipt {
  return {
    id: "test",
    date: "2026-07-24",
    merchant: "Test",
    amount: 100,
    currency: "SEK",
    category: "Software",
    expense_type: "business",
    vat_amount: 20,
    payment_method: "card",
    confidence: 0.95,
    image_url: null,
    notes: null,
    status: "processed",
    created_at: "2026-07-24T00:00:00Z",
    document_type: "receipt",
    file_name: null,
    mime_type: null,
    file_hash: null,
    invoice_number: null,
    supplier_org_number: null,
    supplier_vat_number: null,
    due_date: null,
    net_amount: 80,
    vat_rate: 25,
    vat_country: "SE",
    ocr_reference: null,
    original_currency: "SEK",
    exchange_rate: 1,
    amount_sek: 100,
    account_code: null,
    payment_account: null,
    cost_center: null,
    project_code: null,
    deductible_vat: 20,
    approval_status: "approved",
    approved_at: "2026-07-24T00:00:00Z",
    archived_at: null,
    duplicate_of: null,
    updated_at: null,
    ...overrides,
  };
}

describe("currency-safe receipt totals", () => {
  it("does not mix native currencies", () => {
    const totals = getCurrencyTotals([
      receipt({ amount: 100, currency: "SEK" }),
      receipt({ id: "eur", amount: 20, currency: "EUR", amount_sek: 220 }),
    ]);

    expect(totals).toEqual([
      { currency: "EUR", amount: 20, count: 1 },
      { currency: "SEK", amount: 100, count: 1 },
    ]);
  });

  it("uses only known SEK equivalents", () => {
    expect(
      getSekEquivalentTotal([
        receipt({ amount_sek: 100 }),
        receipt({ id: "eur", currency: "EUR", amount_sek: 220 }),
        receipt({ id: "usd", currency: "USD", amount_sek: null }),
      ]),
    ).toBe(320);
  });

  it("counts foreign receipts without an exchange rate", () => {
    expect(
      getMissingExchangeRateCount([
        receipt({ currency: "SEK", amount_sek: 100 }),
        receipt({ id: "eur", currency: "EUR", amount_sek: null }),
      ]),
    ).toBe(1);
  });
});
