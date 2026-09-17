import { asc, desc, eq } from "drizzle-orm";
import { KanbanSquare } from "lucide-react";
import { EmptyState, PageHeader, PlannedAction } from "@/components/admin-ui";
import { CrmBoard } from "@/components/crm-board";
import { getDb } from "@/db";
import { clients, deals, stages } from "@/db/schema";
import { clientScope, requireModule } from "@/lib/access";
import { formatMoney } from "@/lib/format";

export default async function CrmPage() {
  const user = await requireModule("crm");
  const db = getDb();
  const [stageRows, dealRows] = await Promise.all([
    db.select({ id: stages.id, name: stages.name, color: stages.color }).from(stages).orderBy(asc(stages.position)),
    db.select({ id: deals.id, title: deals.title, client: clients.name, stageId: deals.stageId, value: deals.estimatedValueCents, tags: deals.tags, nextActionAt: deals.nextActionAt }).from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).where(clientScope(user)).orderBy(desc(deals.updatedAt)).limit(200),
  ]);
  const cards = dealRows.map((card) => ({ ...card, value: card.value === null ? "Valor não informado" : formatMoney(card.value), nextActionAt: card.nextActionAt?.toISOString() ?? null }));

  return <div className="admin-content">
    <PageHeader eyebrow="Relacionamento" title="CRM comercial" description={`${cards.length} negócios no funil. Acompanhe cada oportunidade por etapa.`} action={<PlannedAction label="Nova oportunidade" />} />
    {stageRows.length ? <CrmBoard columns={stageRows} cards={cards} /> : <EmptyState icon={KanbanSquare} title="Nenhuma etapa configurada" description="Configure as etapas do funil antes de receber contatos." />}
  </div>;
}
