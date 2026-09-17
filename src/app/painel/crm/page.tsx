import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { CalendarClock, KanbanSquare } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals, stages } from "@/db/schema";
import { requireModule, clientScope } from "@/lib/access";
import { formatMoney } from "@/lib/format";
import { EmptyState, PageHeader } from "@/components/admin-ui";
export default async function CrmPage() {
  const user = await requireModule("crm"); const db = getDb();
  const [columns, cards] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.position)),
    db.select({ id: deals.id, title: deals.title, client: clients.name, stageId: deals.stageId, value: deals.estimatedValueCents, tags: deals.tags, nextActionAt: deals.nextActionAt }).from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).where(clientScope(user)).orderBy(desc(deals.updatedAt)).limit(200),
  ]);
  return <div className="admin-content"><PageHeader eyebrow="Relacionamento" title="CRM comercial" description={`${cards.length} negócios no funil. Acompanhe cada oportunidade por etapa.`}/>
    {columns.length ? <div className="kanban">{columns.map((column) => { const items = cards.filter((card) => card.stageId === column.id); return <section className="kanban-column" key={column.id}><header><div><i style={{ background: column.color }}/><strong>{column.name}</strong></div><span>{items.length}</span></header><div className="kanban-stack">{items.map((card) => <Link className="deal-card" href={`/painel/crm/${card.id}`} key={card.id}><div className="deal-card-top">{card.tags.slice(0,2).map((tag) => <span key={tag}>{tag}</span>)}</div><h3>{card.client}</h3><p>{card.title}</p><strong>{card.value === null ? "Valor não informado" : formatMoney(card.value)}</strong><small><CalendarClock/>{card.nextActionAt ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(card.nextActionAt) : "Sem próxima atividade"}</small></Link>)}{items.length === 0 ? <p className="column-empty">Nenhum negócio nesta etapa</p> : null}</div></section>; })}</div> : <EmptyState icon={KanbanSquare} title="Nenhuma etapa configurada" description="Configure as etapas do funil antes de receber contatos."/>}
  </div>;
}
