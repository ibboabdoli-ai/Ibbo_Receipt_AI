import {
  getApprovalLabel,
  type ApprovalStatus,
} from "../lib/receipts";

const classes: Record<ApprovalStatus, string> = {
  approved: "bg-sky-100 text-sky-950 ring-sky-200",
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
  rejected: "bg-rose-100 text-rose-950 ring-rose-200",
};

export function ApprovalBadge({ status }: { status: ApprovalStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-black ring-1 ${classes[status]}`}
    >
      {getApprovalLabel(status)}
    </span>
  );
}
