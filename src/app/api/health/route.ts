import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await getDb().execute(sql`SELECT (SELECT name FROM operation_runs LIMIT 1), (SELECT id FROM password_resets LIMIT 1), (SELECT upload_status FROM property_documents LIMIT 1), (SELECT user_id FROM user_mfa LIMIT 1), (SELECT mfa_verified_at FROM sessions LIMIT 1), (SELECT id FROM operation_run_events LIMIT 1), (SELECT upload_expired_at FROM property_photos LIMIT 1)`);
    return NextResponse.json({status:"ok",service:"avan-imoveis",timestamp:new Date().toISOString()},{headers:{"cache-control":"no-store"}});
  } catch { return NextResponse.json({status:"unavailable"},{status:503,headers:{"cache-control":"no-store"}}); }
}
