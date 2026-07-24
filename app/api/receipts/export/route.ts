import { NextRequest } from "next/server";
import {
  getExportReceipts,
  receiptsToCsv,
} from "../../../../lib/receipt-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const receipts = await getExportReceipts(request.nextUrl.searchParams);
    const csv = receiptsToCsv(receipts);
    const month = request.nextUrl.searchParams.get("month");
    const suffix = month && /^\d{4}-\d{2}$/.test(month) ? `-${month}` : "";

    return new Response(csv, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="ibbo-receipts${suffix}.csv"`,
        "Content-Type": "text/csv; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET CSV export failed", error);

    return new Response("Failed to export receipts.\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
