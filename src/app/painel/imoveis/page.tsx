import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { ListFilters, Pagination } from "@/components/list-tools";
import { value, pageNumber, PAGE_SIZE, type Query } from "@/lib/list-query";
import { and, count, ilike, or, gte, lte, desc, sql } from "drizzle-orm";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { properties } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
export default async function AdminPropertiesPage({searchParams}:{searchParams:Promise<Query>}) {
  const user=await requireModule("imoveis");
  const query=await searchParams;const page=pageNumber(query);const search=value(query,"q");
  const low=Number(value(query,"min"));const high=Number(value(query,"max"));
  const where=and(search?or(ilike(properties.title,`%${search}%`),ilike(properties.code,`%${search}%`)):undefined,value(query,"city")?ilike(properties.city,`%${value(query,"city")}%`):undefined,value(query,"neighborhood")?ilike(properties.neighborhood,`%${value(query,"neighborhood")}%`):undefined,value(query,"type")?ilike(properties.type,value(query,"type")):undefined,value(query,"status")?sql`${properties.status}::text = ${value(query,"status")}`:undefined,Number.isFinite(low)&&low>0?gte(properties.priceCents,Math.min(2147483647,Math.round(low*100))):undefined,Number.isFinite(high)&&high>0?lte(properties.priceCents,Math.min(2147483647,Math.round(high*100))):undefined);
  const [total]=await getDb().select({value:count()}).from(properties).where(where);
  const rows = await getDb().select({ id: properties.id, code: properties.code, title: properties.title, status: properties.status, city: properties.city, neighborhood: properties.neighborhood, price: properties.priceCents, updatedAt: properties.updatedAt }).from(properties).where(where).orderBy(desc(properties.updatedAt)).limit(PAGE_SIZE).offset((page-1)*PAGE_SIZE);
  return <div className="admin-content">
    <PageHeader eyebrow="Portfólio" title="Imóveis" description="Gerencie os imóveis cadastrados e a disponibilidade no site." action={<Link className="admin-button primary" href="/painel/imoveis/novo"><Plus/> Novo imóvel</Link>}/>
    <ListFilters scope="imoveis" userId={user.id} query={query}><label>Status<select name="status" defaultValue={value(query,"status")}><option value="">Todos</option>{["rascunho","disponivel","reservado","vendido","pausado"].map(s=><option key={s}>{s}</option>)}</select></label>{[["city","Cidade"],["neighborhood","Bairro"],["type","Tipo"],["min","Preço mínimo (R$)"],["max","Preço máximo (R$)"]].map(([key,label])=><label key={key}>{label}<input name={key} defaultValue={value(query,key)}/></label>)}</ListFilters>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} imóveis</strong><span>Ordenados pela atualização mais recente</span></div></div><div className="table-scroll"><table><thead><tr><th>Imóvel</th><th>Localização</th><th>Valor</th><th>Status</th><th>Atualizado</th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>{rows.map((p) => <tr key={p.id}><td><Link className="property-cell" href={`/painel/imoveis/${p.id}`}><span className="table-thumb"><Building2/></span><span><strong>{p.title}</strong><small>{p.code}</small></span></Link></td><td>{p.neighborhood}<small>{p.city}</small></td><td><strong>{formatMoney(p.price)}</strong></td><td><StatusBadge value={p.status}/></td><td>{new Intl.DateTimeFormat("pt-BR").format(p.updatedAt)}</td><td><Link className="row-action" href={`/painel/imoveis/${p.id}`} aria-label={`Editar ${p.title}`}><ChevronRight/></Link></td></tr>)}</tbody></table></div></section> : <EmptyState icon={Building2} title="Nenhum imóvel cadastrado" description="Cadastre o primeiro imóvel para iniciar seu portfólio." action={<Link className="admin-button primary" href="/painel/imoveis/novo"><Plus/> Novo imóvel</Link>}/>}
  <Pagination query={query} page={page} total={total.value}/></div>;
}
