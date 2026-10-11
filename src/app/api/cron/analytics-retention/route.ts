import { recordOperation } from "@/lib/operation-status";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const configured = Number(process.env.ANALYTICS_RETENTION_DAYS || 90);
  const retentionDays = Number.isFinite(configured) ? Math.min(730, Math.max(30, Math.trunc(configured))) : 90;
  const db = getDb();

  try {
    const result = await db.execute(sql`SELECT retain_analytics(${retentionDays}::int) AS removed`);
    await recordOperation("analytics-retention", true);
    return NextResponse.json({ ok: true, retentionDays, removed: Number(result.rows[0]?.removed || 0) });
  } catch {
    await recordOperation("analytics-retention", false).catch(() => undefined);
    console.error("analytics_retention_failed");
    return NextResponse.json({ error: "Não foi possível consolidar os analytics." }, { status: 503 });
  }
}
