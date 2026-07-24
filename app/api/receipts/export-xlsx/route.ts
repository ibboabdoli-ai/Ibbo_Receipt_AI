import { NextRequest } from "next/server";
import * as XLSX from "xlsx";
import {
  getExportReceipts,
  receiptToExportRow,
} from "../../../../lib/receipt-export";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const receipts = await getExportReceipts(request.nextUrl.searchParams);
    const rows = receipts.map(receiptToExportRow);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!autofilter"] = {
      ref: worksheet["!ref"] || "A1:A1",
    };
    worksheet["!cols"] = Object.keys(rows[0] || { receipt: "" }).map(
      (key) => ({
        wch: Math.min(42, Math.max(12, key.length + 3)),
      }),
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Receipts");
    const buffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "buffer",
    });
    const month = request.nextUrl.searchParams.get("month");
    const suffix = month && /^\d{4}-\d{2}$/.test(month) ? `-${month}` : "";

    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="ibbo-receipts${suffix}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET XLSX export failed", error);

    return new Response("Failed to export Excel file.\n", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
