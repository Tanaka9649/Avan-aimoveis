import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { leadInput } from "@/lib/lead-input";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "JSON inválido." }, { status: 400 }); }
  const parsed = leadInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos informados." }, { status: 400 });
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!await checkRateLimit(`lead:${ip}`, 5, 3600000)) {
      return NextResponse.json({ error: "Muitas solicitações. Tente novamente mais tarde." }, { status: 429 });
    }
    const p = parsed.data;
    // One statement: all dependent writes commit together, or none do.
    const result = await getDb().execute(sql`
      with eligible as (
        select p.id, p.title, p.price_cents, s.id as stage_id
        from properties p cross join lateral (
          select id from stages where not is_won and not is_lost order by position limit 1
        ) s
        where p.id = ${p.propertyId}::uuid and p.status = 'disponivel' and p.published_at is not null
      ), new_client as (
        insert into clients (name, phone, email, origin, lgpd_consent_at)
        select ${p.name}, ${p.phone}, ${p.email}, 'site', now() from eligible returning id
      ), new_deal as (
        insert into deals (client_id, stage_id, title, estimated_value_cents, position, tags)
        select c.id, e.stage_id, left('Interesse — ' || e.title, 180), e.price_cents, 1000, '["site","novo-lead"]'::jsonb
        from new_client c cross join eligible e returning id, client_id
      ), linked as (
        insert into deal_properties (deal_id, property_id)
        select d.id, e.id from new_deal d cross join eligible e returning deal_id
      ), recorded as (
        insert into activities (deal_id, client_id, type, description)
        select id, client_id, 'lead_recebido', ${p.message || "Interesse enviado pelo site"} from new_deal returning id
      ) select id from new_deal
    `);
    if (!result.rows.length) return NextResponse.json({ error: "Este imóvel não está disponível para atendimento no momento." }, { status: 409 });
    return NextResponse.json({ message: "Recebemos seus dados. Nossa equipe entrará em contato." }, { status: 201 });
  } catch {
    // Do not log database errors: they can contain the contact's personal data.
    console.error("lead_create_failed");
    return NextResponse.json({ error: "Serviço temporariamente indisponível." }, { status: 503 });
  }
}
