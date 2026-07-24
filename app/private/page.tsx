import { ReceiptCollection } from "../../components/receipt-collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function PrivatePage() {
  return (
    <ReceiptCollection
      description="Active receipts classified as private costs. These stay separate from business bookkeeping exports."
      emptyMessage="No private receipts found."
      eyebrow="Expenses"
      filters={{ archive: "active", expenseType: "private", sort: "date_desc" }}
      title="Private expenses"
    />
  );
}
