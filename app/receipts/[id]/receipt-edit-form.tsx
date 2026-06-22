"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Receipt } from "../../../lib/receipts";

type ReceiptEditFormProps = {
  receipt: Receipt;
};

function toNumberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const parsed = Number(trimmed.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function ReceiptEditForm({ receipt }: ReceiptEditFormProps) {
  const router = useRouter();
  const [merchant, setMerchant] = useState(receipt.merchant);
  const [amount, setAmount] = useState(String(receipt.amount));
  const [date, setDate] = useState(receipt.date);
  const [currency, setCurrency] = useState(receipt.currency);
  const [category, setCategory] = useState(receipt.category);
  const [expenseType, setExpenseType] = useState(receipt.expense_type);
  const [vatAmount, setVatAmount] = useState(receipt.vat_amount === null ? "" : String(receipt.vat_amount));
  const [paymentMethod, setPaymentMethod] = useState(receipt.payment_method ?? "");
  const [status, setStatus] = useState(receipt.status);
  const [notes, setNotes] = useState(receipt.notes ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/receipts/${receipt.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merchant,
          amount: toNumberOrNull(amount) ?? 0,
          date,
          currency,
          category,
          expense_type: expenseType,
          vat_amount: toNumberOrNull(vatAmount),
          payment_method: paymentMethod,
          notes,
          status,
        }),
      });

      if (!response.ok) {
        throw new Error("Could not save receipt changes");
      }

      setMessage("Receipt updated ✅");
      router.refresh();
    } catch (error) {
      console.error(error);
      setMessage("Could not update receipt ❌");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Manual correction</p>
        <h2 className="text-2xl font-black text-slate-950">Correct receipt data</h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Update extracted values before reports and export use the receipt.
        </p>
      </div>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Merchant
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setMerchant(event.target.value)}
              value={merchant}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Amount
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              inputMode="decimal"
              onChange={(event) => setAmount(event.target.value)}
              value={amount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Date
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setDate(event.target.value)}
              type="date"
              value={date}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Currency
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setCurrency(event.target.value)}
              value={currency}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Category
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setCategory(event.target.value)}
              value={category}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Type
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setExpenseType(event.target.value as Receipt["expense_type"])}
              value={expenseType}
            >
              <option value="business">business</option>
              <option value="private">private</option>
              <option value="unknown">unknown</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            VAT
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              inputMode="decimal"
              onChange={(event) => setVatAmount(event.target.value)}
              placeholder="Optional"
              value={vatAmount}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700">
            Payment method
            <input
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setPaymentMethod(event.target.value)}
              placeholder="card, cash, unknown"
              value={paymentMethod}
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
            Status
            <select
              className="rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setStatus(event.target.value as Receipt["status"])}
              value={status}
            >
              <option value="processed">processed</option>
              <option value="needs_review">needs_review</option>
            </select>
          </label>

          <label className="grid gap-2 text-sm font-bold text-slate-700 md:col-span-2">
            Notes
            <textarea
              className="min-h-28 rounded-2xl border border-slate-200 px-4 py-3 text-slate-950 outline-none focus:border-slate-400"
              onChange={(event) => setNotes(event.target.value)}
              value={notes}
            />
          </label>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            className="rounded-2xl bg-slate-950 px-6 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : "Save correction"}
          </button>
          {message ? <p className="text-sm font-bold text-slate-600">{message}</p> : null}
        </div>
      </form>
    </section>
  );
}
