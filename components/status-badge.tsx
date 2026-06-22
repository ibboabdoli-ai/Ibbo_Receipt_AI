import { getStatusLabel, type ReceiptStatus } from "../lib/receipts";

type StatusBadgeProps = {
  status: ReceiptStatus;
};

const statusClasses: Record<ReceiptStatus, string> = {
  processed: "bg-emerald-100 text-emerald-950 ring-emerald-200",
  needs_review: "bg-amber-100 text-amber-950 ring-amber-200",
  failed: "bg-rose-100 text-rose-950 ring-rose-200"
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${statusClasses[status]}`}>
      {getStatusLabel(status)}
    </span>
  );
}
