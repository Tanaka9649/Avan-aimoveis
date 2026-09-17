import Link from "next/link";
import { Building2, ChevronRight, Plus } from "lucide-react";
import { desc } from "drizzle-orm";
import { requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { properties } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { EmptyState, PageHeader, StatusBadge } from "@/components/admin-ui";
export default async function AdminPropertiesPage() {
  await requireModule("imoveis");
  const rows = await getDb().select({ id: properties.id, code: properties.code, title: properties.title, status: properties.status, city: properties.city, neighborhood: properties.neighborhood, price: properties.priceCents, updatedAt: properties.updatedAt }).from(properties).orderBy(desc(properties.updatedAt)).limit(50);
  return <div className="admin-content">
    <PageHeader eyebrow="Portfólio" title="Imóveis" description="Gerencie os imóveis cadastrados e a disponibilidade no site." action={<Link className="admin-button primary" href="/painel/imoveis/novo"><Plus/> Novo imóvel</Link>}/>
    {rows.length ? <section className="admin-card table-card"><div className="table-toolbar"><div><strong>{rows.length} imóveis</strong><span>Ordenados pela atualização mais recente</span></div></div><div className="table-scroll"><table><thead><tr><th>Imóvel</th><th>Localização</th><th>Valor</th><th>Status</th><th>Atualizado</th><th><span className="sr-only">Abrir</span></th></tr></thead><tbody>{rows.map((p) => <tr key={p.id}><td><Link className="property-cell" href={`/painel/imoveis/${p.id}`}><span className="table-thumb"><Building2/></span><span><strong>{p.title}</strong><small>{p.code}</small></span></Link></td><td>{p.neighborhood}<small>{p.city}</small></td><td><strong>{formatMoney(p.price)}</strong></td><td><StatusBadge value={p.status}/></td><td>{new Intl.DateTimeFormat("pt-BR").format(p.updatedAt)}</td><td><Link className="row-action" href={`/painel/imoveis/${p.id}`} aria-label={`Editar ${p.title}`}><ChevronRight/></Link></td></tr>)}</tbody></table></div></section> : <EmptyState icon={Building2} title="Nenhum imóvel cadastrado" description="Cadastre o primeiro imóvel para iniciar seu portfólio." action={<Link className="admin-button primary" href="/painel/imoveis/novo"><Plus/> Novo imóvel</Link>}/>}
  </div>;
}
