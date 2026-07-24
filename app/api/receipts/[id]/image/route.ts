import { NextRequest, NextResponse } from "next/server";
import { getReceiptById } from "../../../../../lib/receipt-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function safeDownloadName(name: string) {
  return name.replace(/[\r\n"]/g, "_").slice(0, 120) || "receipt";
}

export async function GET(
  _request: NextRequest,
  context: RouteContext,
) {
  try {
    const { id } = await context.params;
    const receipt = await getReceiptById(id);

    if (!receipt?.image_url) {
      return new NextResponse("Stored document not found.", { status: 404 });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return new NextResponse("Blob access is not configured.", {
        status: 500,
      });
    }

    const response = await fetch(receipt.image_url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok || !response.body) {
      console.error("Private blob fetch failed", {
        status: response.status,
        receiptId: id,
      });
      return new NextResponse("Stored document could not be loaded.", {
        status: response.status === 404 ? 404 : 502,
      });
    }

    const fileName = safeDownloadName(
      receipt.file_name || `receipt-${receipt.id}`,
    );

    return new NextResponse(response.body, {
      headers: {
        "Cache-Control": "private, no-cache",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Content-Type":
          receipt.mime_type ||
          response.headers.get("content-type") ||
          "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET receipt image failed", error);
    return new NextResponse("Stored document could not be loaded.", {
      status: 500,
    });
  }
}
