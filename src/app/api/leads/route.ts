import { databaseErrorIs } from "@/lib/database-error";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { properties, tenants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { checkRateLimit } from "@/lib/rate-limit";
import { leadInput } from "@/lib/lead-input";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }
  const parsed = leadInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos informados." }, { status: 400 });
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!await checkRateLimit(`lead:${parsed.data.propertyId}:${ip}`, 5, 3_600_000)) {
      return NextResponse.json({ error: "Muitas solicitações. Tente novamente mais tarde." }, { status: 429 });
    }
    const payload = parsed.data;
    const result = await getDb().execute(sql`SELECT intake_property_lead(${payload.propertyId}::uuid, ${payload.name}, ${payload.phone}, ${payload.email}, ${payload.message || ""}) AS id`);
    if (!result.rows[0]?.id) return NextResponse.json({ error: "Este imóvel não está disponível para atendimento no momento." }, { status: 409 });
    // Send a minimal notification; details remain in the authenticated CRM.
    const [tenant] = await getDb().select({ email: tenants.email, id: tenants.id }).from(properties).innerJoin(tenants, eq(tenants.id, properties.tenantId)).where(eq(properties.id, payload.propertyId)).limit(1);
    if (tenant?.email) await sendEmail({ to: tenant.email, subject: "Novo interesse em imóvel", text: "Um interessado enviou uma solicitação pelo site. Acesse o CRM da sua empresa para acompanhar o atendimento.", key: `lead/${result.rows[0].id}/${Date.now()}` });
    return NextResponse.json({ message: "Recebemos seus dados. Nossa equipe entrará em contato." }, { status: 201 });
  } catch (error) {
    if (databaseErrorIs(error,"lead_contact_conflict") || databaseErrorIs(error,"client_contact_duplicate")) return NextResponse.json({error:"Não foi possível confirmar esses dados de contato. Confira-os ou fale diretamente com a empresa."},{status:409});
    if (databaseErrorIs(error,"tenant_quota_exceeded")) return NextResponse.json({ error: "Atendimento pelo formulário temporariamente indisponível. Utilize o contato da empresa." }, { status: 409 });
    console.error("lead_create_failed");
    return NextResponse.json({ error: "Serviço temporariamente indisponível." }, { status: 503 });
  }
}
