import Link from "next/link";
import { and, asc, count, desc, eq, gte, sum } from "drizzle-orm";
import { Building2, CalendarCheck, CircleDollarSign, Gauge, HandCoins, Handshake, MessageCircle, Users } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getDb } from "@/db";
import { activityLogs, clients, deals, properties, proposals, sales, stages, visits, whatsappClicks } from "@/db/schema";
import { formatMoney } from "@/lib/format";
import { MetricCard, PageHeader, SectionCard, StatusBadge } from "@/components/admin-ui";

const number = (value: unknown) => Number(value || 0);
export default async function DashboardPage() {
  const user = await requireUser();
  if (user.role !== "admin") return <div className="admin-content"><PageHeader eyebrow="Área de trabalho" title={`Bem-vindo, ${user.name}`} description="Use a navegação para acessar os módulos liberados pelo administrador."/></div>;
  const db = getDb();
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0);
  const now = new Date();
  const [[clientTotal], [newClients], [activeProperties], [dealTotal], [futureVisits], [openProposals], [salesMonth], [whatsappMonth], funnel, propertyStatus, recentActivity] = await Promise.all([
    db.select({ value: count() }).from(clients),
    db.select({ value: count() }).from(clients).where(gte(clients.createdAt, monthStart)),
    db.select({ value: count() }).from(properties).where(eq(properties.status, "disponivel")),
    db.select({ value: count() }).from(deals),
    db.select({ value: count() }).from(visits).where(and(gte(visits.scheduledAt, now), eq(visits.status, "agendada"))),
    db.select({ value: count() }).from(proposals).where(eq(proposals.status, "aberta")),
    db.select({ count: count(), amount: sum(sales.amountCents), commission: sum(sales.commissionCents) }).from(sales).where(gte(sales.soldAt, monthStart)),
    db.select({ value: count() }).from(whatsappClicks).where(gte(whatsappClicks.createdAt, monthStart)),
    db.select({ id: stages.id, name: stages.name, color: stages.color, value: count(deals.id) }).from(stages).leftJoin(deals, eq(deals.stageId, stages.id)).groupBy(stages.id).orderBy(asc(stages.position)),
    db.select({ status: properties.status, value: count() }).from(properties).groupBy(properties.status),
    db.select({ id: activityLogs.id, entityType: activityLogs.entityType, action: activityLogs.action, createdAt: activityLogs.createdAt }).from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(6),
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
  const maxFunnel = Math.max(1, ...funnel.map((row) => number(row.value)));
  return <div className="admin-content">
    <PageHeader eyebrow="Visão geral" title="Painel operacional" description="Acompanhe os principais números e o andamento da operação."/>
    <div className="metric-grid">{metrics.map((metric) => <MetricCard key={metric.label} {...metric}/>)}</div>
    <div className="dashboard-grid">
      <SectionCard title="Funil comercial" description="Negócios distribuídos por etapa." action={<Link className="text-action" href="/painel/crm">Abrir CRM</Link>}>
        <div className="data-bars">{funnel.map((row) => <div key={row.id}><div><span><i style={{ background: row.color }}/>{row.name}</span><strong>{row.value}</strong></div><span><i style={{ width: `${number(row.value) / maxFunnel * 100}%`, background: row.color }}/></span></div>)}</div>
      </SectionCard>
      <SectionCard title="Imóveis por status" description="Distribuição atual do portfólio.">
        <div className="status-summary">{propertyStatus.length ? propertyStatus.map((row) => <div key={row.status}><StatusBadge value={row.status}/><strong>{row.value}</strong></div>) : <p className="muted-copy">Nenhum imóvel cadastrado.</p>}</div>
      </SectionCard>
      <SectionCard title="Atividade recente" description="Últimas alterações registradas na plataforma." className="dashboard-wide">
        <div className="activity-list">{recentActivity.length ? recentActivity.map((item) => <div key={item.id}><span className="activity-dot"/><div><strong>{item.action.replaceAll("_", " ")}</strong><small>{item.entityType} · {new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(item.createdAt)}</small></div></div>) : <p className="muted-copy">Nenhuma atividade registrada.</p>}</div>
      </SectionCard>
      <SectionCard title="WhatsApp" description="Cliques registrados no mês." className="dashboard-secondary"><div className="secondary-metric"><MessageCircle/><strong>{whatsappMonth.value}</strong><span>interações</span></div></SectionCard>
    </div>
  </div>;
}
