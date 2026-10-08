import Link from "next/link";
import { sql } from "drizzle-orm";
import { BarChart3, Eye, Heart, MessageCircle, Search, Send, Users } from "lucide-react";
import { getDb } from "@/db";
import { requireModule } from "@/lib/access";

export const dynamic = "force-dynamic";

type Summary = { event_type: string; total: number; visitors: number };
type TopProperty = { id: string; title: string; views: number; visitors: number; whatsapp: number; leads: number };
type TrafficSource = { source: string; total: number };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ period?: string; from?: string; to?: string }> }) {
  const user = await requireModule("analytics");
  const params = await searchParams;
  const period = ["1", "7", "30"].includes(params.period || "") ? Number(params.period) : 30;
  const validDate = /^\d{4}-\d{2}-\d{2}$/;
  const custom = params.period === "custom" && validDate.test(params.from || "") && validDate.test(params.to || "");
  const from = custom ? new Date(`${params.from}T00:00:00.000Z`) : null;
  const to = custom ? new Date(`${params.to}T23:59:59.999Z`) : null;
  const db = getDb();

  const [summaryResult, uniqueResult, topResult, sourceResult] = await Promise.all([
    db.execute(sql`
      select event_type, count(*)::int as total, count(distinct anonymous_session_id)::int as visitors
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and created_at between ${from} and ${to}) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
      group by event_type
    `),
    db.execute(sql`
      select count(distinct anonymous_session_id)::int as visitors
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and created_at between ${from} and ${to}) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
    `),
    db.execute(sql`
      select p.id, p.title,
        count(*) filter (where e.event_type = 'property_view')::int as views,
        count(distinct e.anonymous_session_id) filter (where e.event_type = 'property_view')::int as visitors,
        count(*) filter (where e.event_type = 'whatsapp_click')::int as whatsapp,
        count(*) filter (where e.event_type = 'interest_submit')::int as leads
      from properties p
      left join analytics_events e on e.property_id = p.id and e.tenant_id = p.tenant_id
        and ((${custom} and e.created_at between ${from} and ${to}) or (${!custom} and e.created_at >= now() - make_interval(days => ${period})))
      where p.tenant_id = ${user.tenantId}::uuid
      group by p.id, p.title
      order by views desc, leads desc, whatsapp desc
      limit 20
    `),
    db.execute(sql`
      select coalesce(nullif(utm_source, ''), 'Direto / não informado') as source, count(*)::int as total
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid
        and ((${custom} and created_at between ${from} and ${to}) or (${!custom} and created_at >= now() - make_interval(days => ${period})))
      group by coalesce(nullif(utm_source, ''), 'Direto / não informado')
      order by total desc
      limit 8
    `),
  ]);

  const rows = summaryResult.rows as unknown as Summary[];
  const values = Object.fromEntries(rows.map((row) => [row.event_type, Number(row.total)]));
  const uniqueVisitors = Number((uniqueResult.rows[0] as { visitors?: number } | undefined)?.visitors || 0);
  const contacts = (values.whatsapp_click || 0) + (values.interest_submit || 0);
  const propertyViews = values.property_view || 0;
  const conversion = propertyViews ? (contacts / propertyViews) * 100 : 0;
  const metrics = [
    { label: "Visitantes únicos", value: uniqueVisitors.toLocaleString("pt-BR"), Icon: Users },
    { label: "Visualizações do site", value: String(values.site_view || 0), Icon: Eye },
    { label: "Visualizações de imóveis", value: String(propertyViews), Icon: BarChart3 },
    { label: "Buscas", value: String(values.search || 0), Icon: Search },
    { label: "Favoritos", value: String(values.favorite_add || 0), Icon: Heart },
    { label: "Cliques no WhatsApp", value: String(values.whatsapp_click || 0), Icon: MessageCircle },
    { label: "Interesses enviados", value: String(values.interest_submit || 0), Icon: Send },
    { label: "Conversão para contato", value: `${conversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`, Icon: Send },
  ];

  return <div className="admin-page">
    <div className="admin-page-heading">
      <div><span className="admin-eyebrow">Desempenho do site</span><h1>Analytics</h1><p>Métricas públicas, isoladas para este tenant e sem IP puro.</p></div>
      <BarChart3 aria-hidden="true"/>
    </div>
    <nav className="admin-tabs" aria-label="Período">
      <Link href="/painel/analytics?period=1">Hoje</Link>
      <Link href="/painel/analytics?period=7">7 dias</Link>
      <Link href="/painel/analytics?period=30">30 dias</Link>
    </nav>
    <form className="entity-form" method="get">
      <input type="hidden" name="period" value="custom"/>
      <label>De<input type="date" name="from" required defaultValue={custom ? params.from : ""}/></label>
      <label>Até<input type="date" name="to" required defaultValue={custom ? params.to : ""}/></label>
      <div><button className="admin-secondary">Aplicar período</button></div>
    </form>
    <section className="metric-grid">{metrics.map(({ label, value, Icon }) => <article className="metric-card" key={label}><Icon aria-hidden="true"/><span>{label}</span><strong>{value}</strong></article>)}</section>
    <section className="admin-card">
      <div className="admin-card-heading"><h2>Desempenho por imóvel</h2><p>Visualizações, visitantes e contatos no período.</p></div>
      <div className="admin-table-wrap"><table className="admin-table">
        <thead><tr><th>Imóvel</th><th>Visualizações</th><th>Visitantes</th><th>WhatsApp</th><th>Interesses</th><th>Conversão</th></tr></thead>
        <tbody>{(topResult.rows as unknown as TopProperty[]).map((row) => {
          const rowContacts = Number(row.whatsapp) + Number(row.leads);
          const rowConversion = Number(row.views) ? rowContacts / Number(row.views) * 100 : 0;
          return <tr key={row.id}><td>{row.title}</td><td>{Number(row.views).toLocaleString("pt-BR")}</td><td>{Number(row.visitors).toLocaleString("pt-BR")}</td><td>{Number(row.whatsapp).toLocaleString("pt-BR")}</td><td>{Number(row.leads).toLocaleString("pt-BR")}</td><td>{rowConversion.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%</td></tr>;
        })}</tbody>
      </table></div>
    </section>
    <section className="admin-card">
      <div className="admin-card-heading"><h2>Origem do tráfego</h2><p>UTM é usada somente em analytics e não altera a origem comercial do CRM.</p></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Origem</th><th>Eventos</th></tr></thead><tbody>{(sourceResult.rows as unknown as TrafficSource[]).map((row) => <tr key={row.source}><td>{row.source}</td><td>{Number(row.total).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
