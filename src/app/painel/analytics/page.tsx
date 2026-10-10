import Link from "next/link";
import { sql } from "drizzle-orm";
import { BarChart3, Eye, Heart, MessageCircle, Search, Send, TrendingUp, Users } from "lucide-react";
import { MetricCard, PageHeader } from "@/components/admin-ui";
import { getDb } from "@/db";
import { requireModule } from "@/lib/access";

export const dynamic = "force-dynamic";

type Summary = { event_type: string; total: number; visitors: number };
type TopProperty = { id: string; title: string; views: number; visitors: number; whatsapp: number; leads: number };
type TrafficSource = { source: string; total: number };
type DailyTrend = { day: string; views: number; property_views: number; contacts: number };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const user = await requireModule("analytics");
  const params = await searchParams;
  const period = ["1", "7", "30"].includes(params.period || "") ? Number(params.period) : 30;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const custom = params.period === "custom" && validDate.test(params.from || "") && validDate.test(params.to || "");
  const fromDate = custom ? params.from! : null;
  const toDate = custom ? params.to! : null;
  const db = getDb();

  const [summaryResult, uniqueResult, topResult, sourceResult, dailyResult] = await Promise.all([
    db.execute(sql`
      select event_type, count(*)::int as total, count(distinct anonymous_session_id)::int as visitors
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and (created_at at time zone 'America/Sao_Paulo')::date between ${fromDate}::date and ${toDate}::date) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
      group by event_type
    `),
    db.execute(sql`
      select count(distinct anonymous_session_id)::int as visitors
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and (created_at at time zone 'America/Sao_Paulo')::date between ${fromDate}::date and ${toDate}::date) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
    `),
    db.execute(sql`
      select p.id, p.title,
        count(*) filter (where e.event_type = 'property_view')::int as views,
        count(distinct e.anonymous_session_id) filter (where e.event_type = 'property_view')::int as visitors,
        count(*) filter (where e.event_type = 'whatsapp_click')::int as whatsapp,
        count(*) filter (where e.event_type = 'interest_submit')::int as leads
      from properties p
      left join analytics_events e on e.property_id = p.id and e.tenant_id = p.tenant_id
        and ((${custom} and (e.created_at at time zone 'America/Sao_Paulo')::date between ${fromDate}::date and ${toDate}::date) or (${!custom} and e.created_at >= now() - make_interval(days => ${period})))
      where p.tenant_id = ${user.tenantId}::uuid
      group by p.id, p.title
      order by views desc, leads desc, whatsapp desc
      limit 20
    `),
    db.execute(sql`
      select coalesce(nullif(utm_source, ''), 'Direto / não informado') as source, count(*)::int as total
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and (created_at at time zone 'America/Sao_Paulo')::date between ${fromDate}::date and ${toDate}::date) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
      group by coalesce(nullif(utm_source, ''), 'Direto / não informado')
      order by total desc
      limit 8
    `),
    db.execute(sql`
      with bounds as (
        select
          case when ${custom} then ${fromDate}::date else (now() at time zone 'America/Sao_Paulo')::date - (${period}::int - 1) end as start_day,
          case when ${custom} then ${toDate}::date else (now() at time zone 'America/Sao_Paulo')::date end as end_day
      ),
      days as (
        select generate_series(start_day, end_day, interval '1 day')::date as day from bounds
      )
      select
        to_char(days.day, 'YYYY-MM-DD') as day,
        count(e.id) filter (where e.event_type = 'site_view')::int as views,
        count(e.id) filter (where e.event_type = 'property_view')::int as property_views,
        count(e.id) filter (where e.event_type in ('whatsapp_click','interest_submit'))::int as contacts
      from days
      left join analytics_events e
        on e.tenant_id = ${user.tenantId}::uuid
       and (e.created_at at time zone 'America/Sao_Paulo')::date = days.day
      group by days.day
      order by days.day
    `),
  ]);

  const rows = summaryResult.rows as unknown as Summary[];
  const values = Object.fromEntries(rows.map((row) => [row.event_type, Number(row.total)]));
  const uniqueVisitors = Number((uniqueResult.rows[0] as { visitors?: number } | undefined)?.visitors || 0);
  const contacts = (values.whatsapp_click || 0) + (values.interest_submit || 0);
  const propertyViews = values.property_view || 0;
  const conversion = propertyViews ? (contacts / propertyViews) * 100 : 0;
  const metrics = [
    { label: "Visitantes únicos", value: uniqueVisitors.toLocaleString("pt-BR"), helper: "pessoas no período", icon: Users, tone: "blue" as const, featured: true },
    { label: "Visualizações de imóveis", value: String(propertyViews), helper: "aberturas de anúncios", icon: Eye, tone: "blue" as const },
    { label: "Cliques no WhatsApp", value: String(values.whatsapp_click || 0), helper: "intenções de contato", icon: MessageCircle, tone: "green" as const, featured: true },
    { label: "Conversão para contato", value: `${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, helper: "contatos ÷ visualizações", icon: TrendingUp, tone: "green" as const, featured: true },
    { label: "Visualizações do site", value: String(values.site_view || 0), helper: "páginas visualizadas", icon: BarChart3, tone: "slate" as const },
    { label: "Buscas", value: String(values.search || 0), helper: "pesquisas realizadas", icon: Search, tone: "slate" as const },
    { label: "Favoritos", value: String(values.favorite_add || 0), helper: "imóveis salvos", icon: Heart, tone: "amber" as const },
    { label: "Interesses enviados", value: String(values.interest_submit || 0), helper: "formulários enviados", icon: Send, tone: "amber" as const },
  ];

  const daily = (dailyResult.rows as unknown as DailyTrend[]).map((row) => ({
    day: row.day,
    views: Number(row.views),
    propertyViews: Number(row.property_views),
    contacts: Number(row.contacts),
  }));
  const maxDaily = Math.max(1, ...daily.map((row) => row.views + row.propertyViews + row.contacts));
  const periodHref = (days: number) => `/painel/analytics?period=${days}`;

  return (
    <div className="admin-content">
      <PageHeader eyebrow="Desempenho" title="Analytics" description="Acompanhe tráfego, interesse e conversão do site desta empresa." />

      <section className="admin-card analytics-period-card">
        <div className="admin-tabs" aria-label="Período">
          <Link className={!custom && period === 1 ? "active" : ""} href={periodHref(1)}>Hoje</Link>
          <Link className={!custom && period === 7 ? "active" : ""} href={periodHref(7)}>7 dias</Link>
          <Link className={!custom && period === 30 ? "active" : ""} href={periodHref(30)}>30 dias</Link>
        </div>
        <form className="entity-form" method="get">
          <input type="hidden" name="period" value="custom"/>
          <label>De<input type="date" name="from" required defaultValue={custom ? params.from : ""}/></label>
          <label>Até<input type="date" name="to" required defaultValue={custom ? params.to : ""}/></label>
          <div><button className="admin-button secondary">Aplicar período</button></div>
        </form>
      </section>

      <section className="metric-grid analytics-metrics" aria-label="Indicadores do período">
        {metrics.slice(0,4).map((metric) => <MetricCard key={metric.label} {...metric}/>)}
      </section>
      <section className="metric-grid secondary-kpis analytics-metrics" aria-label="Indicadores complementares">
        {metrics.slice(4).map((metric) => <MetricCard key={metric.label} {...metric}/>)}
      </section>

      <section className="admin-card analytics-trend-card">
        <div className="table-toolbar"><div><strong>Evolução no período</strong><span>Visitas ao site, visualizações de imóveis e contatos por dia.</span></div></div>
        {daily.length ? <div className="analytics-trend" role="img" aria-label="Evolução diária de visitas, imóveis vistos e contatos">
          {daily.map((row) => {
            const total = row.views + row.propertyViews + row.contacts;
            return <div className="analytics-trend-day" key={row.day}>
              <div className="analytics-trend-bar-wrap" title={`${row.day}: ${total} interações`}>
                <span className="analytics-trend-bar" style={{ height: `${Math.max(4, total / maxDaily * 100)}%` }}/>
              </div>
              <small>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "UTC" }).format(new Date(row.day + "T00:00:00Z"))}</small>
              <b>{total}</b>
            </div>;
          })}
        </div> : <div className="analytics-empty-chart"><BarChart3/><strong>Ainda não há dados suficientes neste período.</strong><span>Quando houver visitas e contatos, a evolução aparecerá aqui.</span></div>}
        <div className="analytics-trend-legend"><span>Interações = páginas vistas + imóveis vistos + contatos</span></div>
      </section>

      <section className="admin-card table-card analytics-table-card">
        <div className="table-toolbar"><div><strong>Desempenho por imóvel</strong><span>Visualizações, visitantes e contatos no período.</span></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Imóvel</th><th>Visualizações</th><th>Visitantes</th><th>WhatsApp</th><th>Interesses</th><th>Conversão</th></tr></thead>
            <tbody>{(topResult.rows as unknown as TopProperty[]).map((row) => {
              const rowContacts = Number(row.whatsapp) + Number(row.leads);
              const rowConversion = Number(row.views) ? rowContacts / Number(row.views) * 100 : 0;
              return <tr key={row.id}><td><strong>{row.title}</strong></td><td>{Number(row.views).toLocaleString("pt-BR")}</td><td>{Number(row.visitors).toLocaleString("pt-BR")}</td><td>{Number(row.whatsapp).toLocaleString("pt-BR")}</td><td>{Number(row.leads).toLocaleString("pt-BR")}</td><td>{rowConversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td></tr>;
            })}</tbody>
          </table>
        </div>
      </section>

      <section className="admin-card table-card analytics-table-card">
        <div className="table-toolbar"><div><strong>Origem do tráfego</strong><span>Esta origem é usada somente para análise e não altera a origem comercial do CRM.</span></div></div>
        <div className="table-scroll">
          <table>
            <thead><tr><th>Origem</th><th>Eventos</th></tr></thead>
            <tbody>{(sourceResult.rows as unknown as TrafficSource[]).map((row) => <tr key={row.source}><td><strong>{row.source}</strong></td><td>{Number(row.total).toLocaleString("pt-BR")}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
