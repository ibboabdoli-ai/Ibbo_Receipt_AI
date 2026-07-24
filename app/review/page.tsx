import { ReceiptCollection } from "../../components/receipt-collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function ReviewPage() {
  return (
    <ReceiptCollection
      description="Resolve low-confidence extraction, unknown expense types, pending approvals, and possible duplicates before export."
      emptyMessage="No receipts currently require review."
      eyebrow="Workflow"
      filters={{ archive: "active", reviewOnly: true, sort: "created_desc" }}
      title="Review queue"
    />
  );
}
