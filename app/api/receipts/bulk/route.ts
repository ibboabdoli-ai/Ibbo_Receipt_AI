import { NextRequest, NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../../lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedActions = new Set([
  "archive",
  "restore",
  "approve",
  "review",
]);

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      ids?: unknown;
      action?: unknown;
    };
    const ids = Array.isArray(body.ids)
      ? body.ids
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 100)
      : [];
    const action = typeof body.action === "string" ? body.action : "";

    if (!ids.length || !allowedActions.has(action)) {
      return NextResponse.json(
        { ok: false, error: "Invalid bulk action." },
        { status: 400 },
      );
    }

    await ensureReceiptsTable();
    const placeholders = ids.map(() => "?").join(",");
    let assignment = "";

    if (action === "archive") {
      assignment = `
        archived_at = CURRENT_TIMESTAMP,
        approval_status = 'pending',
        approved_at = NULL
      `;
    } else if (action === "restore") {
      assignment = "archived_at = NULL";
    } else if (action === "approve") {
      assignment = `
        approval_status = 'approved',
        approved_at = CURRENT_TIMESTAMP
      `;
    } else {
      assignment = `
        status = 'needs_review',
        approval_status = 'pending',
        approved_at = NULL
      `;
    }

    const result = await db.execute({
      sql: `
        UPDATE receipts
        SET ${assignment}, updated_at = CURRENT_TIMESTAMP
        WHERE id IN (${placeholders})
      `,
      args: ids,
    });

    return NextResponse.json({
      ok: true,
      updated: Number(result.rowsAffected || 0),
    });
  } catch (error) {
    console.error("PATCH receipt bulk failed", error);
    return NextResponse.json(
      { ok: false, error: "Bulk update failed." },
      { status: 500 },
    );
  }
}
