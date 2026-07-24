"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  formatCurrency,
  formatDate,
  type Receipt,
} from "../lib/receipts";
import { ApprovalBadge } from "./approval-badge";
import { StatusBadge } from "./status-badge";

type ReceiptTableProps = {
  receipts: Receipt[];
  enableBulkActions?: boolean;
};

type BulkAction = "archive" | "approve" | "review" | "restore";

export function ReceiptTable({
  receipts,
  enableBulkActions = false,
}: ReceiptTableProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const allSelected = useMemo(
    () => receipts.length > 0 && selected.length === receipts.length,
    [receipts.length, selected.length],
  );

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  }

  async function applyBulkAction(action: BulkAction) {
    if (!selected.length) return;

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/receipts/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Bulk update failed");
      }

      setMessage(`${selected.length} receipt(s) updated.`);
      setSelected([]);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Bulk update failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      {enableBulkActions ? (
        <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-black text-slate-950">
              {selected.length} selected
            </p>
            {message ? (
              <p className="mt-1 text-sm text-slate-600">{message}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                Select rows to approve, review, archive, or restore.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-xl bg-sky-100 px-3 py-2 text-xs font-black text-sky-950 disabled:opacity-50"
              disabled={busy || !selected.length}
              onClick={() => applyBulkAction("approve")}
              type="button"
            >
              Approve
            </button>
            <button
              className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-black text-amber-950 disabled:opacity-50"
              disabled={busy || !selected.length}
              onClick={() => applyBulkAction("review")}
              type="button"
            >
              Needs review
            </button>
            <button
              className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-800 disabled:opacity-50"
              disabled={busy || !selected.length}
              onClick={() => applyBulkAction("archive")}
              type="button"
            >
              Archive
            </button>
            <button
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
              disabled={busy || !selected.length}
              onClick={() => applyBulkAction("restore")}
              type="button"
            >
              Restore
            </button>
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              <tr>
                {enableBulkActions ? (
                  <th className="px-4 py-4">
                    <input
                      aria-label="Select all receipts"
                      checked={allSelected}
                      onChange={() =>
                        setSelected(allSelected ? [] : receipts.map((item) => item.id))
                      }
                      type="checkbox"
                    />
                  </th>
                ) : null}
                <th className="px-5 py-4">Date</th>
                <th className="px-5 py-4">Merchant</th>
                <th className="px-5 py-4">Category</th>
                <th className="px-5 py-4">Type</th>
                <th className="px-5 py-4 text-right">Amount</th>
                <th className="px-5 py-4">Workflow</th>
                <th className="px-5 py-4 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.map((receipt) => (
                <tr className={receipt.archived_at ? "opacity-60" : ""} key={receipt.id}>
                  {enableBulkActions ? (
                    <td className="px-4 py-4">
                      <input
                        aria-label={`Select ${receipt.merchant}`}
                        checked={selected.includes(receipt.id)}
                        onChange={() => toggle(receipt.id)}
                        type="checkbox"
                      />
                    </td>
                  ) : null}
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {formatDate(receipt.date)}
                  </td>
                  <td className="px-5 py-4">
                    <Link
                      className="font-black text-slate-950 underline-offset-4 hover:underline"
                      href={`/receipts/${receipt.id}`}
                    >
                      {receipt.merchant}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      Confidence {(receipt.confidence * 100).toFixed(0)}%
                      {receipt.invoice_number
                        ? ` · Invoice ${receipt.invoice_number}`
                        : ""}
                    </p>
                    {receipt.duplicate_of ? (
                      <p className="mt-1 text-xs font-bold text-rose-700">
                        Possible duplicate
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-slate-600">
                    {receipt.category}
                  </td>
                  <td className="px-5 py-4 font-bold capitalize text-slate-600">
                    {receipt.expense_type}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <p className="font-black text-slate-950">
                      {formatCurrency(receipt.amount, receipt.currency)}
                    </p>
                    {receipt.currency !== "SEK" && receipt.amount_sek !== null ? (
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        ≈ {formatCurrency(receipt.amount_sek, "SEK")}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col items-start gap-2">
                      <StatusBadge status={receipt.status} />
                      <ApprovalBadge status={receipt.approval_status} />
                      {receipt.archived_at ? (
                        <span className="text-xs font-black text-slate-500">
                          Archived
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white hover:bg-slate-700"
                      href={`/receipts/${receipt.id}`}
                    >
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {receipts.map((receipt) => (
            <article className={receipt.archived_at ? "p-4 opacity-60" : "p-4"} key={receipt.id}>
              <div className="flex items-start gap-3">
                {enableBulkActions ? (
                  <input
                    aria-label={`Select ${receipt.merchant}`}
                    checked={selected.includes(receipt.id)}
                    className="mt-1"
                    onChange={() => toggle(receipt.id)}
                    type="checkbox"
                  />
                ) : null}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        className="break-words font-black text-slate-950 underline-offset-4 hover:underline"
                        href={`/receipts/${receipt.id}`}
                      >
                        {receipt.merchant}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatDate(receipt.date)}
                      </p>
                    </div>
                    <p className="shrink-0 font-black text-slate-950">
                      {formatCurrency(receipt.amount, receipt.currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={receipt.status} />
                    <ApprovalBadge status={receipt.approval_status} />
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                      {receipt.category}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">
                      {receipt.expense_type}
                    </span>
                    {receipt.duplicate_of ? (
                      <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-black text-rose-900">
                        Duplicate
                      </span>
                    ) : null}
                    <Link
                      className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white"
                      href={`/receipts/${receipt.id}`}
                    >
                      Open review
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
