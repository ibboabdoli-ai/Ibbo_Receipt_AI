import Link from "next/link";
import { ReceiptCollection } from "../../components/receipt-collection";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default function BookkeepingPage() {
  return (
    <div className="space-y-7">
      <ReceiptCollection
        description="Approved business receipts with a known SEK equivalent, no duplicate marker, and processed extraction status."
        emptyMessage="No receipts are fully ready for bookkeeping export."
        eyebrow="Accounting"
        filters={{ archive: "active", bookkeepingOnly: true, sort: "date_desc" }}
        title="Bookkeeping-ready receipts"
      />

      <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-soft sm:p-8">
        <h2 className="text-2xl font-black">Export controls</h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
          Use the export page to select a month and download CSV, Excel, or SIE. SIE only includes approved business receipts with an SEK value.
        </p>
        <Link
          className="mt-5 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
          href="/export"
        >
          Open export center
        </Link>
      </section>
    </div>
  );
}
