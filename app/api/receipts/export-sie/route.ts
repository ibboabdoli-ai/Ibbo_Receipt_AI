import { NextRequest } from "next/server";
import {
  getExportReceipts,
  receiptsToSie,
} from "../../../../lib/receipt-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const params = new URLSearchParams(request.nextUrl.searchParams);
    params.set("type", "business");
    params.set("status", "processed");
    params.set("approval", "approved");
    params.set("clean", "1");

    const receipts = await getExportReceipts(params);
    const result = receiptsToSie(receipts);
    const month = params.get("month");
    const suffix = month && /^\d{4}-\d{2}$/.test(month) ? `-${month}` : "";

    return new Response(result.content, {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="ibbo-bookkeeping${suffix}.se"`,
        "Content-Type": "text/plain; charset=utf-8",
        "X-Exported-Receipts": String(result.included),
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET SIE export failed", error);

    return new Response("Failed to export SIE draft.\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
