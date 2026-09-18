import Link from "next/link";
import { ListFilters, Pagination } from "@/components/list-tools";
import { value, pageNumber, PAGE_SIZE, type Query } from "@/lib/list-query";
import { and, ilike, or, count, asc, desc, eq } from "drizzle-orm";
import { KanbanSquare } from "lucide-react";
import { EmptyState, PageHeader } from "@/components/admin-ui";
import { CrmBoard } from "@/components/crm-board";
import { getDb } from "@/db";
import { clients, deals, stages } from "@/db/schema";
import { clientScope, requireModule } from "@/lib/access";
import { formatMoney } from "@/lib/format";

export default async function CrmPage({searchParams}:{searchParams:Promise<Query>}) {
  const user = await requireModule("crm");
  const db = getDb();
  const query=await searchParams;const page=pageNumber(query);const search=value(query,"q");const where=and(clientScope(user),search?or(ilike(deals.title,`%${search}%`),ilike(clients.name,`%${search}%`)):undefined);
  const [total]=await db.select({value:count()}).from(deals).innerJoin(clients,eq(clients.id,deals.clientId)).where(where);
  const [stageRows, dealRows] = await Promise.all([
    db.select({ id: stages.id, name: stages.name, color: stages.color }).from(stages).orderBy(asc(stages.position)),
    db.select({ id: deals.id, title: deals.title, clientId:clients.id, client: clients.name, phone:clients.phone, email:clients.email, stageId: deals.stageId, value: deals.estimatedValueCents, tags: deals.tags, nextActionAt: deals.nextActionAt, nextActionType:deals.nextActionType,nextActionNote:deals.nextActionNote,stageEnteredAt:deals.stageEnteredAt }).from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).where(where).orderBy(desc(deals.updatedAt)).limit(PAGE_SIZE).offset((page-1)*PAGE_SIZE),
  ]);
  const referenceTime=new Date().getTime();const cards = dealRows.map((card) => ({ ...card, value: card.value === null ? "Valor não informado" : formatMoney(card.value), nextActionAt: card.nextActionAt?.toISOString() ?? null, stageDays:Math.max(0,Math.floor((referenceTime-card.stageEnteredAt.getTime())/86400000)) }));

  return <div className="admin-content">
    <PageHeader eyebrow="Relacionamento" title="CRM comercial" description={`${cards.length} negócios no funil. Acompanhe cada oportunidade por etapa.`} action={<Link className="admin-button primary" href="/painel/crm/novo">Nova oportunidade</Link>} />
    <ListFilters scope="crm" userId={user.id} query={query}/>
    {stageRows.length ? <CrmBoard columns={stageRows} cards={cards} /> : <EmptyState icon={KanbanSquare} title="Nenhuma etapa configurada" description="Configure as etapas do funil antes de receber contatos." />}
  <Pagination query={query} page={page} total={total.value}/></div>;
}
