import { NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../lib/db";

export const runtime = "nodejs";

export async function GET() {
  try {
    await ensureReceiptsTable();

    const result = await db.execute(
      "SELECT id, date, merchant, amount, currency, category, expense_type, vat_amount, payment_method, confidence, image_url, notes, status, created_at FROM receipts ORDER BY created_at DESC LIMIT 50",
    );

    return NextResponse.json({
      ok: true,
      receipts: result.rows,
    });
  } catch (error) {
    console.error("GET /api/receipts failed", error);

    return NextResponse.json(
      {
        ok: false,
        receipts: [],
        error: "Failed to load receipts",
      },
      { status: 500 },
    );
  }
}
