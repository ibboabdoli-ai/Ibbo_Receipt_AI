import { NextResponse } from "next/server";
import { db, ensureReceiptsTable } from "../../../lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const startedAt = Date.now();

  try {
    await ensureReceiptsTable();
    const result = await db.execute(
      "SELECT COUNT(*) AS total FROM receipts",
    );

    return NextResponse.json({
      ok: true,
      database: "connected",
      receipts: Number(result.rows[0]?.total || 0),
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      authOverrideConfigured: Boolean(
        process.env.APP_BASIC_AUTH_USERNAME &&
          process.env.APP_BASIC_AUTH_PASSWORD_SHA256,
      ),
      region: process.env.VERCEL_REGION || "local",
      durationMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed", error);

    return NextResponse.json(
      {
        ok: false,
        database: "error",
        durationMs: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}
