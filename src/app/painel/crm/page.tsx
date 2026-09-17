import Link from "next/link";
import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals, stages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";

export default async function CrmPage() {
  await requireUser();
  const db = getDb();
  const [columns, cards] = await Promise.all([
    db.select().from(stages).orderBy(asc(stages.position)),
    db.select({ id: deals.id, title: deals.title, client: clients.name, stageId: deals.stageId, value: deals.estimatedValueCents, nextActionAt: deals.nextActionAt })
      .from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).orderBy(desc(deals.updatedAt)).limit(200),
  ]);
  return <div className="admin-content">
    <div className="admin-page-title"><div><span>Relacionamento</span><h1>CRM comercial</h1></div></div>
    <p>Negócios reais recebidos pelo site. Exibindo os {cards.length} mais recentes (limite de 200).</p>
    {!columns.length && <p role="status">Nenhuma etapa configurada. Configure as etapas antes de receber contatos.</p>}
    <div className="kanban">{columns.map((column) => {
      const items = cards.filter((card) => card.stageId === column.id);
      return <section className="kanban-column" key={column.id}>
        <header><div><i style={{ background: column.color }}/><strong>{column.name}</strong><span>{items.length}</span></div></header>
        {items.map((card) => <article className="deal-card" key={card.id}>
          <h3><Link href={`/painel/crm/${card.id}`}>{card.client}</Link></h3><p>{card.title}</p>
          <strong>{card.value === null ? "Valor não informado" : formatMoney(card.value)}</strong>
          <small>{card.nextActionAt ? `Próxima ação: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(card.nextActionAt)}` : "Sem próxima ação agendada"}</small>
        </article>)}
        {!items.length && <p className="table-empty">Nenhum negócio nesta etapa.</p>}
      </section>;
    })}</div>
  </div>;
}
