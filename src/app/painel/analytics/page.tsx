import { sql } from "drizzle-orm";
import { BarChart3, Eye, MessageCircle, Search, Send } from "lucide-react";
import { getDb } from "@/db";
import { requireModule } from "@/lib/access";

export const dynamic = "force-dynamic";

type Summary = { event_type: string; total: number };
type TopProperty = { id: string; title: string; views: number; leads: number };

export default async function AnalyticsPage() {
  const user = await requireModule("analytics");
  const db = getDb();
  const [summaryResult, topResult] = await Promise.all([
    db.execute(sql`
      select event_type, count(*)::int as total
      from analytics_events
      where tenant_id = ${user.tenantId}::uuid and created_at >= now() - interval '30 days'
      group by event_type
    `),
    db.execute(sql`
      select p.id, p.title,
        count(*) filter (where e.event_type in ('property_view','listing_impression'))::int as views,
        count(*) filter (where e.event_type = 'interest_submit')::int as leads
      from properties p
      left join analytics_events e on e.property_id = p.id and e.tenant_id = p.tenant_id and e.created_at >= now() - interval '30 days'
      where p.tenant_id = ${user.tenantId}::uuid
      group by p.id, p.title
      order by views desc, leads desc
      limit 10
    `),
  ]);
  const values = Object.fromEntries((summaryResult.rows as unknown as Summary[]).map((row) => [row.event_type, Number(row.total)]));
  const metrics = [
    { label: "Visualizações", value: (values.property_view || 0) + (values.listing_impression || 0), Icon: Eye },
    { label: "Buscas", value: values.search || 0, Icon: Search },
    { label: "Interesses", value: values.interest_submit || 0, Icon: Send },
    { label: "Cliques no WhatsApp", value: values.whatsapp_click || 0, Icon: MessageCircle },
  ];
  return <div className="admin-page">
    <div className="admin-page-heading"><div><span className="admin-eyebrow">Últimos 30 dias</span><h1>Analytics</h1><p>Desempenho do site e dos imóveis deste tenant.</p></div><BarChart3 aria-hidden="true"/></div>
    <section className="metric-grid">{metrics.map(({ label, value, Icon }) => <article className="metric-card" key={label}><Icon aria-hidden="true"/><span>{label}</span><strong>{value.toLocaleString("pt-BR")}</strong></article>)}</section>
    <section className="admin-card"><div className="admin-card-heading"><h2>Imóveis com mais interesse</h2><p>Visualizações e conversões, sem dados pessoais.</p></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Imóvel</th><th>Visualizações</th><th>Interesses</th></tr></thead><tbody>{(topResult.rows as unknown as TopProperty[]).map((row) => <tr key={row.id}><td>{row.title}</td><td>{Number(row.views).toLocaleString("pt-BR")}</td><td>{Number(row.leads).toLocaleString("pt-BR")}</td></tr>)}</tbody></table></div>
    </section>
  </div>;
}
