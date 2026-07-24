import { ReceiptCollection } from "../../components/receipt-collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function BusinessPage() {
  return (
    <ReceiptCollection
      description="All active receipts currently classified as business expenses. Approve and assign accounting fields before bookkeeping export."
      emptyMessage="No business receipts found."
      eyebrow="Expenses"
      filters={{ archive: "active", expenseType: "business", sort: "date_desc" }}
      title="Business expenses"
    />
  );
}
