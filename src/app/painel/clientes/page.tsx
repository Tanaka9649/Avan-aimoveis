import Link from "next/link";
import { ListFilters, Pagination } from "@/components/list-tools";
import { value, pageNumber, PAGE_SIZE, type Query } from "@/lib/list-query";
import { and, ilike, or, count, desc, eq } from "drizzle-orm";
import { Users } from "lucide-react";
import { requireModule, clientScope } from "@/lib/access";
import { getDb } from "@/db";
import { clients, deals } from "@/db/schema";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
export default async function ClientsPage({searchParams}:{searchParams:Promise<Query>}) {
  const user = await requireModule("clientes");
  const query=await searchParams;const page=pageNumber(query);const search=value(query,"q");const origin=value(query,"origin");const where=and(clientScope(user),search?or(ilike(clients.name,`%${search}%`),ilike(clients.phone,`%${search}%`),ilike(clients.email,`%${search}%`)):undefined,origin?ilike(clients.origin,`%${origin}%`):undefined);
  const [total]=await getDb().select({value:count()}).from(clients).where(where);
  const rows = await getDb().select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone, origin: clients.origin, budget: clients.budgetMaxCents, consent: clients.lgpdConsentAt, createdAt: clients.createdAt, deals: count(deals.id) }).from(clients).leftJoin(deals, eq(deals.clientId, clients.id)).where(where).groupBy(clients.id).orderBy(desc(clients.createdAt)).limit(PAGE_SIZE).offset((page-1)*PAGE_SIZE);
  return <div className="admin-content"><PageHeader eyebrow="Relacionamento" title="Clientes" description="Consulte contatos, origem e histórico comercial da sua carteira." action={<Link className="admin-button primary" href="/painel/clientes/novo">Novo cliente</Link>}/>
    <ListFilters scope="clientes" userId={user.id} query={query}><label>Origem<input name="origin" defaultValue={origin}/></label></ListFilters>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} clientes</strong><span>Cadastros mais recentes</span></div></div><div className="table-scroll"><table><thead><tr><th>Cliente</th><th>Telefone</th><th>Origem</th><th>Negócios</th><th>Orçamento</th><th>Cadastro</th><th>Consentimento</th></tr></thead><tbody>{rows.map((c) => <tr key={c.id}><td><Link href={`/painel/clientes/${c.id}`}><strong>{c.name}</strong></Link><small>{c.email || "Sem e-mail"}</small></td><td>{c.phone}</td><td><span className="source-tag">{c.origin}</span></td><td>{c.deals}</td><td>{c.budget ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(c.budget / 100) : "—"}</td><td>{new Intl.DateTimeFormat("pt-BR").format(c.createdAt)}</td><td><StatusBadge value={c.consent ? "registrado" : "pendente"}/></td></tr>)}</tbody></table></div></section> : <EmptyState icon={Users} title="Nenhum cliente cadastrado" description="Os contatos recebidos pelo site aparecerão aqui."/>}
  <Pagination query={query} page={page} total={total.value}/></div>;
}
