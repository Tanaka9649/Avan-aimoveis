import Link from "next/link";
import { and, eq, ilike, or } from "drizzle-orm";
import { Building2, KanbanSquare, Search, Users } from "lucide-react";
import { getDb } from "@/db";
import { clients, deals, properties } from "@/db/schema";
import { clientScope } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";
import { EmptyState, PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";

export default async function GlobalSearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const q = (await searchParams).q?.trim() || "";
  const db = getDb();
  const [clientRows, propertyRows, dealRows] = q ? await Promise.all([
    canAccess(user, "clientes") || canAccess(user, "crm")
      ? db.select({ id: clients.id, name: clients.name, phone: clients.phone, email: clients.email }).from(clients).where(and(clientScope(user), or(ilike(clients.name, `%${q}%`), ilike(clients.phone, `%${q}%`), ilike(clients.email, `%${q}%`)))).limit(12)
      : Promise.resolve([]),
    canAccess(user, "imoveis")
      ? db.select({ id: properties.id, title: properties.title, code: properties.code, status: properties.status }).from(properties).where(or(ilike(properties.title, `%${q}%`), ilike(properties.code, `%${q}%`), ilike(properties.city, `%${q}%`), ilike(properties.neighborhood, `%${q}%`))).limit(12)
      : Promise.resolve([]),
    canAccess(user, "crm")
      ? db.select({ id: deals.id, title: deals.title }).from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).where(and(clientScope(user), ilike(deals.title, `%${q}%`))).limit(12)
      : Promise.resolve([]),
  ]) : [[], [], []];
  const total = clientRows.length + propertyRows.length + dealRows.length;
  return <div className="admin-content">
    <PageHeader eyebrow="Pesquisa" title="Busca global" description={q ? `${total} resultado(s) para “${q}”.` : "Pesquise clientes, contatos, imóveis, códigos e oportunidades."}/>
    {!q ? <EmptyState icon={Search} title="Digite o que procura" description="Use a busca no topo ou o atalho Ctrl/Cmd + K."/> : <div className="global-search-results">
      {(canAccess(user, "clientes") || canAccess(user, "crm")) ? <SectionCard title="Clientes" description={`${clientRows.length} resultado(s)`}>{clientRows.length ? clientRows.map((item) => <Link key={item.id} href={`/painel/crm?view=clientes&cliente=${item.id}`}><Users/><div><strong>{item.name}</strong><small>{item.phone} · {item.email || "Sem e-mail"}</small></div></Link>) : <p className="muted-copy">Nenhum cliente encontrado.</p>}</SectionCard> : null}
      {canAccess(user, "imoveis") ? <SectionCard title="Imóveis" description={`${propertyRows.length} resultado(s)`}>{propertyRows.length ? propertyRows.map((item) => <Link key={item.id} href={`/painel/imoveis/${item.id}`}><Building2/><div><strong>{item.title}</strong><small>{item.code}</small></div><StatusBadge value={item.status}/></Link>) : <p className="muted-copy">Nenhum imóvel encontrado.</p>}</SectionCard> : null}
      {canAccess(user, "crm") ? <SectionCard title="Oportunidades" description={`${dealRows.length} resultado(s)`}>{dealRows.length ? dealRows.map((item) => <Link key={item.id} href={`/painel/crm/${item.id}`}><KanbanSquare/><strong>{item.title}</strong></Link>) : <p className="muted-copy">Nenhuma oportunidade encontrada.</p>}</SectionCard> : null}
    </div>}
  </div>;
}
