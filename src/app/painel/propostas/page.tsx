import { desc, eq } from "drizzle-orm";
import { HandCoins } from "lucide-react";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { clients, deals, proposals } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
export default async function ProposalsPage() {
  await requireModule("propostas");
  const rows = await getDb().select({ id: proposals.id, client: clients.name, deal: deals.title, amount: proposals.amountCents, status: proposals.status, validUntil: proposals.validUntil, createdAt: proposals.createdAt }).from(proposals).innerJoin(deals, eq(deals.id, proposals.dealId)).innerJoin(clients, eq(clients.id, deals.clientId)).orderBy(desc(proposals.createdAt)).limit(100);
  return <div className="admin-content"><PageHeader eyebrow="Negociação" title="Propostas e vendas" description="Acompanhe valores, prazos e situação das propostas registradas."/>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} propostas</strong><span>Mais recentes primeiro</span></div></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Negócio</th><th>Valor</th><th>Validade</th><th>Status</th></tr></thead><tbody>{rows.map((proposal) => <tr key={proposal.id}><td><strong>{proposal.client}</strong></td><td>{proposal.deal}</td><td><strong>{formatMoney(proposal.amount)}</strong></td><td>{proposal.validUntil ? new Intl.DateTimeFormat("pt-BR").format(proposal.validUntil) : "Sem prazo"}</td><td><StatusBadge value={proposal.status}/></td></tr>)}</tbody></table></div></section> : <EmptyState icon={HandCoins} title="Nenhuma proposta registrada" description="As negociações aparecerão aqui quando o fluxo de propostas estiver em uso."/>}
  </div>;
}
