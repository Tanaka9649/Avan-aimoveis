import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { cronAuthorized } from "@/lib/cron-auth";
import { recordOperation } from "@/lib/operation-status";
import { reportOperationFailure } from "@/lib/observability";
export const maxDuration=60;
export async function GET(request: Request) {
  if(!cronAuthorized(request))return NextResponse.json({error:"Não autorizado"},{status:401});
  if(!emailConfigured()) {
    await recordOperation("visit-reminder-emails","skipped","email_not_configured");
    return NextResponse.json({status:"skipped",reason:"email_not_configured"});
  }
  const db=getDb();
  try {
    const tasks=await db.execute(sql`WITH selected AS (
      SELECT d.id FROM visit_reminder_deliveries d JOIN visits v ON v.id=d.visit_id AND v.tenant_id=d.tenant_id
      JOIN tenants t ON t.id=d.tenant_id JOIN reminder_settings s ON s.tenant_id=t.id AND s.key='visits'
      WHERE d.sent_at IS NULL AND d.recipient NOT LIKE 'panel:%' AND (d.lease_until IS NULL OR d.lease_until<now())
        AND v.status='agendada' AND v.scheduled_at>now() AND v.scheduled_at<=now()+interval '26 hours' AND t.status IN ('active','trial') AND s.email
        AND s.recipients ? d.recipient
      ORDER BY v.scheduled_at LIMIT 10 FOR UPDATE OF d SKIP LOCKED
    ) UPDATE visit_reminder_deliveries d SET lease_until=now()+interval '5 minutes',attempts=attempts+1 FROM selected x WHERE d.id=x.id RETURNING d.id,d.recipient`);
    const results=await Promise.all(tasks.rows.map(async row=>{
      const ok=await sendEmail({to:String(row.recipient),subject:"Lembrete de visita",text:"Há uma visita agendada nas próximas 26 horas. Acesse a agenda da sua empresa para conferir os detalhes.",key:`visit-reminder/${row.id}`});
      if(ok)await db.execute(sql`UPDATE visit_reminder_deliveries SET sent_at=now(),lease_until=NULL WHERE id=${row.id}::uuid`);
      return ok;
    }));
    const sent=results.filter(Boolean).length,failed=results.length-sent;
    await db.execute(sql`UPDATE visits v SET reminder_sent_at=now() WHERE v.reminder_sent_at IS NULL AND EXISTS(SELECT 1 FROM visit_reminder_deliveries d WHERE d.visit_id=v.id) AND NOT EXISTS(SELECT 1 FROM visit_reminder_deliveries d WHERE d.visit_id=v.id AND d.sent_at IS NULL)`);
    await recordOperation("visit-reminder-emails",failed===0,failed?"transport_failed":undefined);
    return NextResponse.json({sent,failed},{status:failed?503:200});
  } catch {
    reportOperationFailure("cron","visit_reminder_delivery_failed");
    await recordOperation("visit-reminder-emails",false,"delivery_failed").catch(()=>undefined);
    return NextResponse.json({error:"Não foi possível processar as entregas."},{status:503});
  }
}
