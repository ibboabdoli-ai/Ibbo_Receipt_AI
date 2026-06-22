import Link from "next/link";
import { formatCurrency, formatDate, type Receipt } from "../lib/receipts";
import { StatusBadge } from "./status-badge";

type ReceiptTableProps = {
  receipts: Receipt[];
};

export function ReceiptTable({ receipts }: ReceiptTableProps) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-soft">
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
          <thead className="bg-slate-50 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
            <tr>
              <th className="px-5 py-4">Date</th>
              <th className="px-5 py-4">Merchant</th>
              <th className="px-5 py-4">Category</th>
              <th className="px-5 py-4">Type</th>
              <th className="px-5 py-4 text-right">Amount</th>
              <th className="px-5 py-4">Status</th>
              <th className="px-5 py-4 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {receipts.map((receipt) => (
              <tr key={receipt.id}>
                <td className="px-5 py-4 font-semibold text-slate-600">{formatDate(receipt.date)}</td>
                <td className="px-5 py-4">
                  <Link className="font-black text-slate-950 underline-offset-4 hover:underline" href={`/receipts/${receipt.id}`}>
                    {receipt.merchant}
                  </Link>
                  <p className="mt-1 text-xs text-slate-500">Confidence {(receipt.confidence * 100).toFixed(0)}%</p>
                </td>
                <td className="px-5 py-4 text-slate-600">{receipt.category}</td>
                <td className="px-5 py-4 font-bold capitalize text-slate-600">{receipt.expense_type}</td>
                <td className="px-5 py-4 text-right font-black text-slate-950">{formatCurrency(receipt.amount, receipt.currency)}</td>
                <td className="px-5 py-4"><StatusBadge status={receipt.status} /></td>
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
          <article className="p-4" key={receipt.id}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <Link className="font-black text-slate-950 underline-offset-4 hover:underline" href={`/receipts/${receipt.id}`}>
                  {receipt.merchant}
                </Link>
                <p className="mt-1 text-sm text-slate-500">{formatDate(receipt.date)}</p>
              </div>
              <p className="font-black text-slate-950">{formatCurrency(receipt.amount, receipt.currency)}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={receipt.status} />
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{receipt.category}</span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-600">{receipt.expense_type}</span>
              <Link
                className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white"
                href={`/receipts/${receipt.id}`}
              >
                Open review
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
