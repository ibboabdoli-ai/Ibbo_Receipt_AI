import { ReceiptCollection } from "../../components/receipt-collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function CleanPage() {
  return (
    <ReceiptCollection
      description="Processed and approved rows with a valid merchant, date, and amount. Possible duplicates and archived records are excluded."
      emptyMessage="No export-clean receipts are available yet."
      eyebrow="Data readiness"
      filters={{ archive: "active", cleanOnly: true, sort: "date_desc" }}
      title="Clean receipts"
    />
  );
}
