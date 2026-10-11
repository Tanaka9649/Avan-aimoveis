import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { emailConfigured, sendEmail } from "@/lib/email";
import { recordOperation } from "@/lib/operation-status";
export const maxDuration = 60;
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  const db=getDb();
  try {
    const queued=await db.execute(sql`SELECT enqueue_visit_reminders() AS total`);
    let sent=0, failed=0;
    if (emailConfigured()) {
      const tasks=await db.execute(sql`WITH selected AS (
        SELECT d.id FROM visit_reminder_deliveries d JOIN visits v ON v.id=d.visit_id AND v.tenant_id=d.tenant_id
        JOIN tenants t ON t.id=d.tenant_id JOIN reminder_settings s ON s.tenant_id=t.id AND s.key='visits'
        WHERE d.sent_at IS NULL AND d.recipient NOT LIKE 'panel:%' AND (d.lease_until IS NULL OR d.lease_until<now())
          AND v.status='agendada' AND v.scheduled_at>now() AND t.status IN ('active','trial') AND s.email
          AND s.recipients ? d.recipient
        ORDER BY v.scheduled_at LIMIT 10 FOR UPDATE OF d SKIP LOCKED
      ) UPDATE visit_reminder_deliveries d SET lease_until=now()+interval '5 minutes',attempts=attempts+1 FROM selected x WHERE d.id=x.id RETURNING d.id,d.recipient`);
      const results=await Promise.all(tasks.rows.map(async row => {
        const ok=await sendEmail({to:String(row.recipient),subject:"Lembrete de visita",text:"Há uma visita agendada nas próximas 26 horas. Acesse a agenda da sua empresa para conferir os detalhes.",key:`visit-reminder/${row.id}`});
        if(ok) await db.execute(sql`UPDATE visit_reminder_deliveries SET sent_at=now(),lease_until=NULL WHERE id=${row.id}::uuid`);
        return ok;
      }));
      sent=results.filter(Boolean).length; failed=results.length-sent;
    }
    await db.execute(sql`UPDATE visits v SET reminder_sent_at=now() WHERE v.reminder_sent_at IS NULL AND EXISTS(SELECT 1 FROM visit_reminder_deliveries d WHERE d.visit_id=v.id) AND NOT EXISTS(SELECT 1 FROM visit_reminder_deliveries d WHERE d.visit_id=v.id AND d.sent_at IS NULL)`);
    const pending=await db.execute(sql`SELECT count(*)::int AS total FROM visit_reminder_deliveries d JOIN visits v ON v.id=d.visit_id WHERE d.sent_at IS NULL AND v.status='agendada' AND v.scheduled_at>now()`);
    const pendingCount=Number(pending.rows[0]?.total||0);
    await recordOperation("visit-reminders",failed===0 && pendingCount===0);
    return NextResponse.json({panel:Number(queued.rows[0]?.total||0),sent,failed,pending:pendingCount}, {status:failed ? 503 : 200});
  } catch {
    await recordOperation("visit-reminders",false).catch(()=>undefined);
    return NextResponse.json({error:"Não foi possível processar os lembretes."},{status:503});
  }
}
