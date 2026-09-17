import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, clients, deals, dealProperties, properties, proposals, stages, visits } from "@/db/schema";
import { clientScope, requireModule } from "@/lib/access";
import { canAccess } from "@/lib/permissions";
import { PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";
import { ClientEditor } from "@/components/client-editor";
import { AdminTabs } from "@/components/admin-tabs";
import { SettingsForm } from "@/components/settings-form";
import { addClientNote } from "../actions";
import { formatMoney } from "@/lib/format";
export default async function Page({params}:{params:Promise<{id:string}>}){
 const user=await requireModule("clientes");const {id}=await params;if(!z.uuid().safeParse(id).success)notFound();const db=getDb();
 const [client]=await db.select().from(clients).where(and(eq(clients.id,id),clientScope(user)));if(!client)notFound();
 const [opportunities,interests,appointments,offers,history]=await Promise.all([
  canAccess(user,"crm")?db.select({id:deals.id,title:deals.title,stage:stages.name,next:deals.nextActionAt}).from(deals).innerJoin(stages,eq(stages.id,deals.stageId)).where(eq(deals.clientId,id)).orderBy(desc(deals.updatedAt)):[],
  canAccess(user,"imoveis")?db.selectDistinct({id:properties.id,title:properties.title,code:properties.code,status:properties.status}).from(dealProperties).innerJoin(deals,eq(deals.id,dealProperties.dealId)).innerJoin(properties,eq(properties.id,dealProperties.propertyId)).where(eq(deals.clientId,id)):[],
  canAccess(user,"visitas")?db.select({id:visits.id,date:visits.scheduledAt,title:properties.title,status:visits.status}).from(visits).innerJoin(properties,eq(properties.id,visits.propertyId)).where(eq(visits.clientId,id)).orderBy(desc(visits.scheduledAt)):[],
  canAccess(user,"propostas")?db.select({id:proposals.id,amount:proposals.amountCents,status:proposals.status}).from(proposals).innerJoin(deals,eq(deals.id,proposals.dealId)).where(eq(deals.clientId,id)):[],
  db.select({id:activities.id,description:activities.description,date:activities.occurredAt}).from(activities).where(eq(activities.clientId,id)).orderBy(desc(activities.occurredAt)).limit(200),
 ]);
 const initial={id:client.id,name:client.name,phone:client.phone,email:client.email,origin:client.origin,budgetMin:client.budgetMinCents===null?"":client.budgetMinCents/100,budgetMax:client.budgetMaxCents===null?"":client.budgetMaxCents/100,desiredTypes:client.desiredTypes.join(", "),desiredRegions:client.desiredRegions.join(", "),desiredFeatures:client.desiredFeatures.join(", "),minBedrooms:client.minBedrooms,minBathrooms:client.minBathrooms,minParkingSpaces:client.minParkingSpaces};
 const summary=<div className="detail-sections"><SectionCard title="Contatos e preferências"><p>{client.phone} · {client.email||"Sem e-mail"}</p><p>Origem: {client.origin}</p><p>Orçamento: {client.budgetMinCents!==null?formatMoney(client.budgetMinCents):"Não informado"} a {client.budgetMaxCents!==null?formatMoney(client.budgetMaxCents):"Não informado"}</p><p>Tipos: {client.desiredTypes.join(", ")||"Não informado"}</p><p>Regiões: {client.desiredRegions.join(", ")||"Não informado"}</p><p>Características: {client.desiredFeatures.join(", ")||"Não informado"}</p></SectionCard>
 {canAccess(user,"crm")?<SectionCard title="Oportunidades" action={<Link className="text-action" href={`/painel/crm/novo?cliente=${id}`}>Nova oportunidade</Link>}>{opportunities.length?opportunities.map(o=><p key={o.id}><Link href={`/painel/crm/${o.id}`}>{o.title}</Link> · <StatusBadge value={o.stage}/></p>):<p>Nenhuma oportunidade.</p>}</SectionCard>:null}
 {canAccess(user,"imoveis")?<SectionCard title="Imóveis de interesse">{interests.length?interests.map(p=><p key={p.id}><Link href={`/painel/imoveis/${p.id}`}>{p.code} — {p.title}</Link> · <StatusBadge value={p.status}/></p>):<p>Vincule imóveis em uma oportunidade do cliente.</p>}</SectionCard>:null}
 {canAccess(user,"visitas")?<SectionCard title="Visitas">{appointments.length?appointments.map(v=><p key={v.id}>{v.date.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})} · {v.title} · <StatusBadge value={v.status}/></p>):<p>Nenhuma visita.</p>}</SectionCard>:null}
 {canAccess(user,"propostas")?<SectionCard title="Propostas">{offers.length?offers.map(o=><p key={o.id}>{formatMoney(o.amount)} · <StatusBadge value={o.status}/></p>):<p>Nenhuma proposta.</p>}</SectionCard>:null}</div>;
 return <div className="admin-content"><Link className="back-link" href="/painel/clientes">← Clientes</Link><PageHeader title={client.name} eyebrow="Ficha do cliente" description="Contatos, preferências e relacionamento em um só lugar."/>
 <AdminTabs tabs={[{id:"resumo",label:"Visão geral",content:summary},{id:"editar",label:"Dados e preferências",content:<ClientEditor initial={initial}/>},{id:"historico",label:"Histórico",content:<SectionCard title="Histórico de atendimento"><SettingsForm action={addClientNote} label="Registrar nota"><input type="hidden" name="clientId" value={id}/><label className="wide">Nova nota<textarea name="description" required minLength={2} maxLength={10000}/></label></SettingsForm><div className="deal-timeline">{history.map(h=><article key={h.id}><span>•</span><div><time>{h.date.toLocaleString("pt-BR",{timeZone:"America/Sao_Paulo"})}</time><p>{h.description}</p></div></article>)}</div></SectionCard>} ]}/></div>;
}
