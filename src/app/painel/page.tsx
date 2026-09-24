import Link from "next/link";
import { and, asc, count, desc, eq, gte, lte, sql, sum } from "drizzle-orm";
import { Building2, CalendarCheck, CircleDollarSign, Gauge, HandCoins, Handshake, MessageCircle, Users } from "lucide-react";
import { clientScope, requireModule } from "@/lib/access";
import { getDb } from "@/db";
import { activityLogs, clients, deals, properties, proposals, sales, stages, visits, whatsappClicks, propertyViews, clientPropertyPresentations } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { MetricCard, PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";

const number = (value: unknown) => Number(value || 0);
const activityAction:Record<string,string>={created:"cadastrado",create:"cadastrado",updated:"atualizado",duplicated:"duplicado",deleted:"excluído"};
const activityEntity:Record<string,string>={property:"Imóvel",client:"Cliente",deal:"Oportunidade",owner:"Proprietário",visit:"Visita",proposal:"Proposta",sale:"Venda"};
const activityText=(entity:string,action:string)=>`${activityEntity[entity]||"Registro"} ${activityAction[action]||"alterado"}`;
export default async function DashboardPage({searchParams}:{searchParams:Promise<{period?:string}>}) {
  const user = await requireModule("dashboard");
  const db = getDb();
  const scope = clientScope(user);
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const now = new Date();
  const {period}=await searchParams;const days=period==="30"?30:7;const rangeStart=new Date(now.getTime()-days*86400000);const endToday=new Date();endToday.setHours(23,59,59,999);
  const [[clientTotal], [newClients], [activeProperties], [dealTotal], [futureVisits], [openProposals], [salesMonth], [whatsappMonth], funnel, propertyStatus, recentActivity] = await Promise.all([
    db.select({ value: count() }).from(clients).where(scope),
    db.select({ value: count() }).from(clients).where(and(scope, gte(clients.createdAt, monthStart))),
    db.select({ value: count() }).from(properties).where(eq(properties.status, "disponivel")),
    db.select({ value: count() }).from(deals).innerJoin(clients, eq(clients.id, deals.clientId)).where(scope),
    db.select({ value: count() }).from(visits).innerJoin(clients, eq(clients.id, visits.clientId)).where(and(scope, gte(visits.scheduledAt, now), eq(visits.status, "agendada"))),
    db.select({ value: count() }).from(proposals).innerJoin(deals, eq(deals.id, proposals.dealId)).innerJoin(clients, eq(clients.id, deals.clientId)).where(and(scope, eq(proposals.status, "aberta"))),
    db.select({ count: count(), amount: sum(sales.amountCents), commission: sum(sales.commissionCents) }).from(sales).innerJoin(deals, eq(deals.id, sales.dealId)).innerJoin(clients, eq(clients.id, deals.clientId)).where(and(scope, gte(sales.soldAt, monthStart))),
    db.select({ value: count() }).from(whatsappClicks).where(gte(whatsappClicks.createdAt, monthStart)),
    db.select({ id: stages.id, name: stages.name, color: stages.color, value: scope ? sql<number>`count(${deals.id}) filter (where ${scope})` : count(deals.id) }).from(stages).leftJoin(deals, eq(deals.stageId, stages.id)).leftJoin(clients, eq(clients.id, deals.clientId)).groupBy(stages.id).orderBy(asc(stages.position)),
    db.select({ status: properties.status, value: count() }).from(properties).groupBy(properties.status),
    db.select({ id: activityLogs.id, entityType: activityLogs.entityType, action: activityLogs.action, createdAt: activityLogs.createdAt }).from(activityLogs).where(user.role === "admin" ? undefined : eq(activityLogs.userId, user.id)).orderBy(desc(activityLogs.createdAt)).limit(6),
  ]);
  const conversion = number(dealTotal.value) ? Math.round(number(salesMonth.count) / number(dealTotal.value) * 100) : 0;
  const metrics = [
    { label: "Clientes", value: String(clientTotal.value), helper: `+${newClients.value} neste mês`, icon: Users, tone: "blue" as const },
    { label: "Negócios fechados", value: String(salesMonth.count), helper: "vendas no mês", icon: Handshake, tone: "green" as const, featured: true },
    { label: "Visitas", value: String(futureVisits.value), helper: "agendadas a partir de hoje", icon: CalendarCheck, tone: "amber" as const },
    { label: "Imóveis ativos", value: String(activeProperties.value), helper: "disponíveis no catálogo", icon: Building2, tone: "blue" as const, featured: true },
    { label: "Propostas abertas", value: String(openProposals.value), helper: "em negociação", icon: HandCoins, tone: "amber" as const },
    { label: "Vendas no mês", value: formatMoney(number(salesMonth.amount)), helper: "volume realizado", icon: CircleDollarSign, tone: "green" as const, featured: true },
    { label: "Comissão no mês", value: formatMoney(number(salesMonth.commission)), helper: "comissão registrada", icon: CircleDollarSign, tone: "green" as const, featured: true },
    { label: "Taxa de conversão", value: conversion + "%", helper: "vendas ÷ negócios", icon: Gauge, tone: "slate" as const },
  ];
  const [todayActions,topViews,topInterest,topWhatsapp]=await Promise.all([
    db.select({id:deals.id,client:clients.name,type:deals.nextActionType,note:deals.nextActionNote,at:deals.nextActionAt}).from(deals).innerJoin(clients,eq(clients.id,deals.clientId)).where(and(scope,lte(deals.nextActionAt,endToday))).orderBy(asc(deals.nextActionAt)).limit(12),
    db.select({id:properties.id,title:properties.title,region:properties.neighborhood,value:count(propertyViews.id)}).from(propertyViews).innerJoin(properties,eq(properties.id,propertyViews.propertyId)).where(gte(propertyViews.createdAt,rangeStart)).groupBy(properties.id).orderBy(desc(count(propertyViews.id))).limit(5),
    db.select({id:properties.id,title:properties.title,region:properties.neighborhood,value:count(clientPropertyPresentations.id)}).from(clientPropertyPresentations).innerJoin(clients,eq(clients.id,clientPropertyPresentations.clientId)).innerJoin(properties,eq(properties.id,clientPropertyPresentations.propertyId)).where(and(scope,gte(clientPropertyPresentations.presentedAt,rangeStart))).groupBy(properties.id).orderBy(desc(count(clientPropertyPresentations.id))).limit(5),
    db.select({id:properties.id,title:properties.title,region:properties.neighborhood,value:count(whatsappClicks.id)}).from(whatsappClicks).innerJoin(properties,eq(properties.id,whatsappClicks.propertyId)).where(gte(whatsappClicks.createdAt,rangeStart)).groupBy(properties.id).orderBy(desc(count(whatsappClicks.id))).limit(5),
  ]);
  const maxFunnel = Math.max(1, ...funnel.map((row) => number(row.value)));
  return <div className="admin-content">
    <PageHeader eyebrow="Visão geral" title="Painel operacional" description="Acompanhe os principais números e o andamento da operação."/>
    <div className="metric-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric}/>)}</div>
    <div className="dashboard-grid">
      <SectionCard title="O que precisa ser feito hoje" description="Ações vencidas e previstas para hoje." className="dashboard-wide" action={<Link className="text-action" href="/painel/crm">Abrir CRM</Link>}><div className="today-list">{todayActions.length?todayActions.map(item=><Link href={`/painel/crm/${item.id}`} key={item.id} className={item.at&&item.at<now?"is-overdue":""}><time>{item.at?new Intl.DateTimeFormat("pt-BR",{hour:"2-digit",minute:"2-digit",timeZone:"America/Sao_Paulo"}).format(item.at):"—"}</time><div><strong>{item.type||"Retornar contato"} — {item.client}</strong><small>{item.note||"Sem observação"}</small></div></Link>):<p className="muted-copy">Nenhuma ação pendente para hoje.</p>}</div></SectionCard>
      <SectionCard title="Funil comercial" description="Negócios distribuídos por etapa." action={<Link className="text-action" href="/painel/crm">Abrir CRM</Link>}>
        <div className="data-bars">{funnel.map((row) => <div key={row.id}><div><span><i style={{ background: row.color }}/>{row.name}</span><strong>{row.value}</strong></div><span><i style={{ width: `${number(row.value) / maxFunnel * 100}%`, background: row.color }}/></span></div>)}</div>
      </SectionCard>
      <SectionCard title="Imóveis por status" description="Distribuição atual do portfólio.">
        <div className="status-summary">{propertyStatus.length ? propertyStatus.map((row) => <div key={row.status}><StatusBadge value={row.status}/><strong>{row.value}</strong></div>) : <p className="muted-copy">Nenhum imóvel cadastrado.</p>}</div>
      </SectionCard>
      <SectionCard title="Atividade recente" description="Últimas alterações registradas na plataforma." className="dashboard-wide">
        <div className="activity-list">{recentActivity.length ? recentActivity.map((item) => <div key={item.id}><span className="activity-dot"/><div><strong>{activityText(item.entityType,item.action)}</strong><small>{new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.createdAt)}</small></div></div>) : <p className="muted-copy">Nenhuma atividade registrada.</p>}</div>
      </SectionCard>
      <SectionCard title="WhatsApp" description="Cliques registrados no mês." className="dashboard-secondary"><div className="secondary-metric"><MessageCircle/><strong>{whatsappMonth.value}</strong><span>interações</span></div></SectionCard>
      <SectionCard title="Imóveis em destaque" description={`Métricas reais dos últimos ${days} dias.`} className="dashboard-wide" action={<div className="period-switch"><Link className={days===7?"active":""} href="/painel?period=7">7 dias</Link><Link className={days===30?"active":""} href="/painel?period=30">30 dias</Link></div>}><div className="analytics-columns">{[["Mais visualizados",topViews],["Mais interessados",topInterest],["Mais cliques no WhatsApp",topWhatsapp]].map(([title,rows])=><div key={title as string}><h3>{title as string}</h3>{(rows as typeof topViews).length?(rows as typeof topViews).map((item,index)=><Link href={`/painel/imoveis/${item.id}`} key={item.id}><span>{index+1}</span><div><strong>{item.title}</strong><small>{item.region}</small></div><b>{item.value}</b></Link>):<p className="muted-copy">Ainda sem dados no período.</p>}</div>)}</div></SectionCard>
    </div>
  </div>;
}
