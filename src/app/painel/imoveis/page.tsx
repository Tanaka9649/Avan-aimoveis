import Link from "next/link";
import { Plus } from "lucide-react";
import { getDb } from "@/db";
import { properties } from "@/db/schema";
import { desc } from "drizzle-orm";
import { formatMoney } from "@/lib/format";
export default async function AdminPropertiesPage(){const rows=await getDb().select({id:properties.id,code:properties.code,title:properties.title,status:properties.status,city:properties.city,price:properties.priceCents,updatedAt:properties.updatedAt}).from(properties).orderBy(desc(properties.updatedAt)).limit(50);return <div className="admin-content"><div className="admin-page-title"><div><span>Portfólio</span><h1>Imóveis</h1></div><Link className="admin-primary" href="/painel/imoveis/novo"><Plus/> Novo imóvel</Link></div><section className="admin-card table-card"><table><thead><tr><th>Código</th><th>Imóvel</th><th>Cidade</th><th>Valor</th><th>Status</th><th>Atualizado</th></tr></thead><tbody>{rows.map((p)=><tr key={p.id}><td><strong>{p.code}</strong></td><td><Link href={`/painel/imoveis/${p.id}`}>{p.title}</Link></td><td>{p.city}</td><td>{formatMoney(p.price)}</td><td><span className={`status ${p.status}`}>{p.status}</span></td><td>{new Intl.DateTimeFormat("pt-BR").format(p.updatedAt)}</td></tr>)}</tbody></table>{!rows.length&&<div className="table-empty">Nenhum imóvel cadastrado.</div>}</section></div>}
