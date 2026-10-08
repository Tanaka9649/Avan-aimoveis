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
    await db.execute(sql`
      INSERT INTO analytics_daily
        (tenant_id, day, event_type, property_id, total, unique_visitors, updated_at)
      SELECT
        tenant_id,
        created_at::date,
        event_type,
        property_id,
        count(*)::int,
        count(DISTINCT anonymous_session_id)::int,
        now()
      FROM analytics_events
      WHERE created_at < date_trunc('day', now())
      GROUP BY tenant_id, created_at::date, event_type, property_id
      ON CONFLICT (tenant_id, day, event_type, property_id)
      DO UPDATE SET
        total = EXCLUDED.total,
        unique_visitors = EXCLUDED.unique_visitors,
        updated_at = now()
    `);

    const removed = await db.execute(sql`
      DELETE FROM analytics_events
      WHERE created_at < now() - (${retentionDays}::text || ' days')::interval
      RETURNING id
    `);
    return NextResponse.json({
      ok: true,
      retentionDays,
      removed: Array.isArray(removed.rows) ? removed.rows.length : 0,
    });
  } catch (error) {
    console.error("analytics_retention_failed", { reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Não foi possível consolidar os analytics." }, { status: 503 });
  }
}
