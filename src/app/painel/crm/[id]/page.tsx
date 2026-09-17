import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, clients, deals, stages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  const [deal] = await db.select({ title: deals.title, name: clients.name, email: clients.email, phone: clients.phone, value: deals.estimatedValueCents, stage: stages.name })
    .from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).innerJoin(stages, eq(stages.id, deals.stageId)).where(eq(deals.id, id)).limit(1);
  if (!deal) notFound();
  const timeline = await db.select({ id: activities.id, description: activities.description, occurredAt: activities.occurredAt }).from(activities).where(eq(activities.dealId, id)).orderBy(desc(activities.occurredAt)).limit(100);
  return <div className="admin-content">
    <Link href="/painel/crm">← Voltar ao CRM</Link>
    <div className="admin-page-title"><div><span>{deal.stage}</span><h1>{deal.title}</h1></div></div>
    <section className="admin-card"><h2>{deal.name}</h2><p>Telefone: {deal.phone}</p><p>E-mail: {deal.email || "Não informado"}</p><p>Valor estimado: {deal.value === null ? "Não informado" : formatMoney(deal.value)}</p></section>
    <section className="admin-card"><h2>Histórico de atendimento</h2>
      {!timeline.length && <p>Nenhuma atividade registrada.</p>}
      {timeline.map((item) => <article key={item.id}><time dateTime={item.occurredAt.toISOString()}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.occurredAt)}</time><p style={{ whiteSpace: "pre-wrap" }}>{item.description}</p></article>)}
    </section>
  </div>;
}
