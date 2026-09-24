import { ArrowLeft, Clock3, Mail, Phone, UserRound } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";
import { getDb } from "@/db";
import { activities, clients, deals, stages, dealProperties, opportunityAttachments } from "@/db/schema";
import { DealEditor } from "@/components/deal-editor";
import { dealChoices } from "../actions";
import { clientScope, requireModule } from "@/lib/access";
import { formatMoney } from "@/lib/format";
import { OpportunityAttachments } from "@/components/opportunity-attachments";

export default async function DealPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("crm");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();

  const db = getDb();
  const [deal] = await db
    .select({ title: deals.title, name: clients.name, email: clients.email, phone: clients.phone, value: deals.estimatedValueCents, stage: stages.name })
    .from(deals)
    .innerJoin(clients, eq(clients.id, deals.clientId))
    .innerJoin(stages, eq(stages.id, deals.stageId))
    .where(and(eq(deals.id, id), clientScope(user)))
    .limit(1);
  if (!deal) notFound();
  const [record] = await db.select().from(deals).where(eq(deals.id,id));
  const choices=await dealChoices();
  const linked=await db.select({id:dealProperties.propertyId}).from(dealProperties).where(eq(dealProperties.dealId,id));

  const timeline = await db
    .select({ id: activities.id, description: activities.description, occurredAt: activities.occurredAt })
    .from(activities)
    .where(eq(activities.dealId, id))
    .orderBy(desc(activities.occurredAt))
    .limit(100);
  const attachmentRows = await db.select({
    id: opportunityAttachments.id,
    displayName: opportunityAttachments.displayName,
    originalName: opportunityAttachments.originalName,
    mimeType: opportunityAttachments.mimeType,
    sizeBytes: opportunityAttachments.sizeBytes,
    category: opportunityAttachments.category,
    createdAt: opportunityAttachments.createdAt,
  }).from(opportunityAttachments).where(and(eq(opportunityAttachments.opportunityId, id), eq(opportunityAttachments.uploadStatus, "ready"))).orderBy(desc(opportunityAttachments.createdAt));
  const attachments = attachmentRows.map((attachment) => ({ ...attachment, createdAt: attachment.createdAt.toISOString() }));

  return (
    <div className="admin-content">
      <Link href="/painel/crm" className="back-link"><ArrowLeft /> Voltar ao CRM</Link>
      <PageHeader
        eyebrow="Negócio"
        title={deal.title}
        description={`Atendimento de ${deal.name}`}
        action={<StatusBadge value={deal.stage} />}
      />

      <SectionCard title="Gerenciar oportunidade" description="Etapa, responsável pelo cliente, próxima ação, imóveis e notas."><DealEditor choices={choices} initial={{id,clientId:record.clientId,title:record.title,stageId:record.stageId,amount:record.estimatedValueCents===null?"":String(record.estimatedValueCents/100),nextActionAt:record.nextActionAt?.toISOString()||"",nextActionType:record.nextActionType||"",nextActionNote:record.nextActionNote||"",lostReason:record.lostReason||""}} selected={linked.map(p=>p.id)}/></SectionCard>
      <SectionCard title="Arquivos da oportunidade" description="Documentos privados, disponíveis somente para pessoas autorizadas no CRM."><OpportunityAttachments opportunityId={id} initialAttachments={attachments}/></SectionCard>
      <div className="deal-detail-grid">
        <SectionCard title="Contato e oportunidade" description="Dados usados durante o atendimento comercial.">
          <dl className="detail-list">
            <div><dt><UserRound />Cliente</dt><dd>{deal.name}</dd></div>
            <div><dt><Phone />Telefone</dt><dd>{deal.phone}</dd></div>
            <div><dt><Mail />E-mail</dt><dd>{deal.email || "Não informado"}</dd></div>
            <div><dt>Valor estimado</dt><dd>{deal.value === null ? "Não informado" : formatMoney(deal.value)}</dd></div>
          </dl>
        </SectionCard>

        <SectionCard title="Histórico de atendimento" description="Atividades registradas em ordem cronológica.">
          {timeline.length ? (
            <div className="deal-timeline">
              {timeline.map((item) => (
                <article key={item.id}>
                  <span><Clock3 /></span>
                  <div>
                    <time dateTime={item.occurredAt.toISOString()}>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.occurredAt)}</time>
                    <p>{item.description}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : <EmptyState icon={Clock3} title="Nenhuma atividade registrada" description="O histórico deste negócio aparecerá aqui." />}
        </SectionCard>
      </div>
    </div>
  );
}
