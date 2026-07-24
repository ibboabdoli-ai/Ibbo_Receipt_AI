"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  approvalStatuses,
  expenseTypes,
  receiptCategories,
  receiptStatuses,
  type ApprovalStatus,
  type ExpenseType,
  type Receipt,
  type ReceiptStatus,
} from "../../../lib/receipts";

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReceiptEditForm({ receipt }: { receipt: Receipt }) {
  const router = useRouter();
  const [merchant, setMerchant] = useState(receipt.merchant);
  const [documentType, setDocumentType] = useState(receipt.document_type);
  const [amount, setAmount] = useState(String(receipt.amount));
  const [date, setDate] = useState(receipt.date);
  const [dueDate, setDueDate] = useState(receipt.due_date ?? "");
  const [currency, setCurrency] = useState(receipt.currency);
  const [exchangeRate, setExchangeRate] = useState(
    receipt.exchange_rate === null ? "" : String(receipt.exchange_rate),
  );
  const [amountSek, setAmountSek] = useState(
    receipt.amount_sek === null ? "" : String(receipt.amount_sek),
  );
  const [netAmount, setNetAmount] = useState(
    receipt.net_amount === null ? "" : String(receipt.net_amount),
  );
  const [category, setCategory] = useState(receipt.category);
  const [expenseType, setExpenseType] = useState<ExpenseType>(
    receipt.expense_type,
  );
  const [vatAmount, setVatAmount] = useState(
    receipt.vat_amount === null ? "" : String(receipt.vat_amount),
  );
  const [vatRate, setVatRate] = useState(
    receipt.vat_rate === null ? "" : String(receipt.vat_rate),
  );
  const [vatCountry, setVatCountry] = useState(receipt.vat_country ?? "");
  const [deductibleVat, setDeductibleVat] = useState(
    receipt.deductible_vat === null
      ? ""
      : String(receipt.deductible_vat),
  );
  const [paymentMethod, setPaymentMethod] = useState(
    receipt.payment_method ?? "",
  );
  const [invoiceNumber, setInvoiceNumber] = useState(
    receipt.invoice_number ?? "",
  );
  const [supplierOrgNumber, setSupplierOrgNumber] = useState(
    receipt.supplier_org_number ?? "",
  );
  const [supplierVatNumber, setSupplierVatNumber] = useState(
    receipt.supplier_vat_number ?? "",
  );
  const [ocrReference, setOcrReference] = useState(
    receipt.ocr_reference ?? "",
  );
  const [accountCode, setAccountCode] = useState(
    receipt.account_code ?? "",
  );
  const [paymentAccount, setPaymentAccount] = useState(
    receipt.payment_account ?? "1930",
  );
  const [costCenter, setCostCenter] = useState(receipt.cost_center ?? "");
  const [projectCode, setProjectCode] = useState(
    receipt.project_code ?? "",
  );
  const [status, setStatus] = useState<ReceiptStatus>(receipt.status);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(
    receipt.approval_status,
  );
  const [notes, setNotes] = useState(receipt.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  const categories = useMemo(() => {
    const values = [...receiptCategories];
    if (category && !values.includes(category as (typeof receiptCategories)[number])) {
      return [category, ...values];
    }
    return values;
  }, [category]);

  function calculateSek() {
    const original = numberOrNull(amount);
    const rate = numberOrNull(exchangeRate);

    if (currency.toUpperCase() === "SEK" && original !== null) {
      setExchangeRate("1");
      setAmountSek(String(original));
      return;
    }

    if (original !== null && rate !== null) {
      setAmountSek(String(Math.round(original * rate * 100) / 100));
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant,
          document_type: documentType,
          amount: numberOrNull(amount) ?? 0,
          date,
          due_date: dueDate || null,
          currency,
          exchange_rate: numberOrNull(exchangeRate),
          amount_sek: numberOrNull(amountSek),
          net_amount: numberOrNull(netAmount),
          category,
          expense_type: expenseType,
          vat_amount: numberOrNull(vatAmount),
          vat_rate: numberOrNull(vatRate),
          vat_country: vatCountry || null,
          deductible_vat: numberOrNull(deductibleVat),
          payment_method: paymentMethod || null,
          invoice_number: invoiceNumber || null,
          supplier_org_number: supplierOrgNumber || null,
          supplier_vat_number: supplierVatNumber || null,
          ocr_reference: ocrReference || null,
          account_code: accountCode || null,
          payment_account: paymentAccount || null,
          cost_center: costCenter || null,
          project_code: projectCode || null,
          notes,
          status,
          approval_status: approvalStatus,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Could not save receipt changes.");
      }

      setMessage("Receipt updated.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not update receipt.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const inputClass =
    "rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400";

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">
          Manual correction
        </p>
        <h2 className="mt-1 text-2xl font-black text-slate-950">
          Complete bookkeeping data
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          Approval is a manual accounting decision. Confirm the SEK value,
          deductible VAT, and account before exporting.
        </p>
      </div>

      <form className="mt-6 space-y-7" onSubmit={handleSubmit}>
        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-4 text-lg font-black text-slate-950 md:col-span-2">
            Document and supplier
          </legend>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Merchant
            <input
              className={inputClass}
              onChange={(event) => setMerchant(event.target.value)}
              required
              value={merchant}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Document type
            <select
              className={inputClass}
              onChange={(event) => setDocumentType(event.target.value)}
              value={documentType}
            >
              <option value="receipt">receipt</option>
              <option value="invoice">invoice</option>
              <option value="credit_note">credit note</option>
              <option value="unknown">unknown</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Invoice number
            <input
              className={inputClass}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              value={invoiceNumber}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            OCR / reference
            <input
              className={inputClass}
              onChange={(event) => setOcrReference(event.target.value)}
              value={ocrReference}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Supplier organisation number
            <input
              className={inputClass}
              onChange={(event) => setSupplierOrgNumber(event.target.value)}
              value={supplierOrgNumber}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Supplier VAT number
            <input
              className={inputClass}
              onChange={(event) => setSupplierVatNumber(event.target.value)}
              value={supplierVatNumber}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Document date
            <input
              className={inputClass}
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Due date
            <input
              className={inputClass}
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-4 text-lg font-black text-slate-950 md:col-span-2 lg:col-span-4">
            Amounts and currency
          </legend>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Gross amount
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              required
              value={amount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Currency
            <input
              className={inputClass}
              maxLength={3}
              onChange={(event) =>
                setCurrency(event.target.value.toUpperCase())
              }
              value={currency}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Exchange rate to SEK
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setExchangeRate(event.target.value)}
              placeholder="1 for SEK"
              value={exchangeRate}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Amount in SEK
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setAmountSek(event.target.value)}
              value={amountSek}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Net amount
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setNetAmount(event.target.value)}
              value={netAmount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            VAT amount
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setVatAmount(event.target.value)}
              value={vatAmount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            VAT rate %
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setVatRate(event.target.value)}
              value={vatRate}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Deductible VAT in SEK
            <input
              className={inputClass}
              inputMode="decimal"
              onChange={(event) => setDeductibleVat(event.target.value)}
              value={deductibleVat}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            VAT country
            <input
              className={inputClass}
              maxLength={2}
              onChange={(event) =>
                setVatCountry(event.target.value.toUpperCase())
              }
              placeholder="SE"
              value={vatCountry}
            />
          </label>

          <div className="flex items-end">
            <button
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700"
              onClick={calculateSek}
              type="button"
            >
              Calculate SEK
            </button>
          </div>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <legend className="mb-4 text-lg font-black text-slate-950 md:col-span-2 lg:col-span-4">
            Classification and accounts
          </legend>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Category
            <select
              className={inputClass}
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Expense type
            <select
              className={inputClass}
              onChange={(event) =>
                setExpenseType(event.target.value as ExpenseType)
              }
              value={expenseType}
            >
              {expenseTypes.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Expense account
            <input
              className={inputClass}
              inputMode="numeric"
              onChange={(event) => setAccountCode(event.target.value)}
              placeholder="e.g. 6540"
              value={accountCode}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Payment account
            <input
              className={inputClass}
              inputMode="numeric"
              onChange={(event) => setPaymentAccount(event.target.value)}
              placeholder="e.g. 1930"
              value={paymentAccount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Cost center
            <input
              className={inputClass}
              onChange={(event) => setCostCenter(event.target.value)}
              value={costCenter}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Project code
            <input
              className={inputClass}
              onChange={(event) => setProjectCode(event.target.value)}
              value={projectCode}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Payment method
            <input
              className={inputClass}
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="card, cash, bank"
              value={paymentMethod}
            />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 md:grid-cols-2">
          <legend className="mb-4 text-lg font-black text-slate-950 md:col-span-2">
            Workflow
          </legend>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Processing status
            <select
              className={inputClass}
              onChange={(event) =>
                setStatus(event.target.value as ReceiptStatus)
              }
              value={status}
            >
              {receiptStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Approval
            <select
              className={inputClass}
              onChange={(event) =>
                setApprovalStatus(event.target.value as ApprovalStatus)
              }
              value={approvalStatus}
            >
              {approvalStatuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
            Notes
            <textarea
              className={`${inputClass} min-h-32`}
              maxLength={2000}
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
        </fieldset>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save correction"}
          </button>
          {message ? (
            <p className="text-sm font-bold text-slate-600">{message}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
