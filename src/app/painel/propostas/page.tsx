import { desc, eq } from "drizzle-orm";
import { CircleDollarSign, HandCoins } from "lucide-react";
import { AdminTabs } from "@/components/admin-tabs";
import { EmptyState, PageHeader, PlannedAction, StatusBadge } from "@/components/admin-ui";
import { getDb } from "@/db";
import { clients, deals, properties, proposals, sales } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { formatMoney } from "@/lib/format";

export default async function ProposalsPage() {
  await requireModule("propostas");
  const db = getDb();
  const [proposalRows, saleRows] = await Promise.all([
    db.select({ id: proposals.id, client: clients.name, deal: deals.title, amount: proposals.amountCents, status: proposals.status, validUntil: proposals.validUntil, createdAt: proposals.createdAt }).from(proposals).innerJoin(deals, eq(deals.id, proposals.dealId)).innerJoin(clients, eq(clients.id, deals.clientId)).orderBy(desc(proposals.createdAt)).limit(100),
    db.select({ id: sales.id, client: clients.name, property: properties.title, amount: sales.amountCents, commission: sales.commissionCents, soldAt: sales.soldAt }).from(sales).innerJoin(deals, eq(deals.id, sales.dealId)).innerJoin(clients, eq(clients.id, deals.clientId)).innerJoin(properties, eq(properties.id, sales.propertyId)).orderBy(desc(sales.soldAt)).limit(100),
  ]);
  const proposalList = proposalRows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{proposalRows.length} propostas</strong><span>Mais recentes primeiro</span></div></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Negócio</th><th>Valor</th><th>Validade</th><th>Status</th></tr></thead><tbody>{proposalRows.map((proposal) => <tr key={proposal.id}><td><strong>{proposal.client}</strong></td><td>{proposal.deal}</td><td><strong>{formatMoney(proposal.amount)}</strong></td><td>{proposal.validUntil ? new Intl.DateTimeFormat("pt-BR").format(proposal.validUntil) : "Sem prazo"}</td><td><StatusBadge value={proposal.status} /></td></tr>)}</tbody></table></div></section> : <EmptyState icon={HandCoins} title="Nenhuma proposta registrada" description="As negociações aparecerão aqui quando o fluxo de propostas estiver em uso." />;
  const saleList = saleRows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{saleRows.length} vendas concluídas</strong><span>Histórico comercial</span></div></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Imóvel</th><th>Valor final</th><th>Comissão</th><th>Data</th></tr></thead><tbody>{saleRows.map((sale) => <tr key={sale.id}><td><strong>{sale.client}</strong></td><td>{sale.property}</td><td><strong>{formatMoney(sale.amount)}</strong></td><td>{formatMoney(sale.commission)}</td><td>{new Intl.DateTimeFormat("pt-BR").format(sale.soldAt)}</td></tr>)}</tbody></table></div></section> : <EmptyState icon={CircleDollarSign} title="Nenhuma venda concluída" description="O histórico de vendas ficará separado das propostas em negociação." />;

  return <div className="admin-content">
    <PageHeader eyebrow="Negociação" title="Propostas e vendas" description="Acompanhe negociações abertas e o histórico de vendas em áreas separadas." action={<PlannedAction label="Nova proposta" />} />
    <AdminTabs tabs={[{ id: "propostas", label: "Propostas", content: proposalList }, { id: "vendas", label: "Vendas concluídas", content: saleList }]} />
  </div>;
}
