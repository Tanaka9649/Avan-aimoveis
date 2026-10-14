import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { recordOperation } from "@/lib/operation-status";
import { cronAuthorized } from "@/lib/cron-auth";
import { reportOperationFailure } from "@/lib/observability";
export const maxDuration=60;
/** Queues notifications only; this route never calls an email transport. */
export async function GET(request: Request) {
  if(!cronAuthorized(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  try {
    const result=await getDb().execute(sql`SELECT enqueue_visit_reminders() AS total`);
    await recordOperation("visit-reminders",true);
    return NextResponse.json({panel:Number(result.rows[0]?.total||0),emailDelivery:"separate-job"});
  } catch {
    reportOperationFailure("cron","visit_reminder_queue_failed");
    await recordOperation("visit-reminders",false,"queue_failed").catch(()=>undefined);
    return NextResponse.json({error:"Não foi possível preparar os lembretes."},{status:503});
  }
}
