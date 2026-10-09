import Link from "next/link";
import { and, countDistinct, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { properties, tenantMemberships, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { StatusBadge } from "@/components/admin-ui";
import { domainStatusLabels, planLabels, tenantStatusLabels } from "@/lib/ui-labels";

const statuses = ["configuring", "trial", "active", "suspended", "cancelled"] as const;
const plans = ["starter", "pro", "max", "custom"] as const;
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function TenantsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = single(params.q).trim();
  const status = single(params.status);
  const plan = single(params.plan);
  const filters: SQL[] = [];
  if (q) filters.push(or(ilike(tenants.name, "%" + q + "%"), ilike(tenants.slug, "%" + q + "%"), ilike(tenants.customDomain, "%" + q + "%"))!);
  if (statuses.includes(status as typeof statuses[number])) filters.push(eq(tenants.status, status as typeof statuses[number]));
  if (plans.includes(plan as typeof plans[number])) filters.push(eq(tenants.plan, plan));

  const rows = await getDb().select({
    id: tenants.id,
    name: tenants.name,
    slug: tenants.slug,
    status: tenants.status,
    plan: tenants.plan,
    domain: tenants.customDomain,
    domainStatus: tenants.domainStatus,
    users: countDistinct(tenantMemberships.id),
    properties: countDistinct(properties.id),
  }).from(tenants)
    .leftJoin(tenantMemberships, eq(tenantMemberships.tenantId, tenants.id))
    .leftJoin(properties, eq(properties.tenantId, tenants.id))
    .where(and(...filters))
    .groupBy(tenants.id)
    .orderBy(desc(tenants.updatedAt));

  return (
    <main className="admin-content">
      <header className="page-header">
        <div><span className="page-eyebrow">Super Admin</span><h1>Empresas</h1><p>Busca, filtros e indicadores consolidados sem misturar dados operacionais.</p></div>
        <div className="page-header-action"><Link className="admin-button primary" href="/superadmin/empresas/nova">Nova empresa</Link></div>
      </header>
      <section className="admin-card">
        <form className="entity-form" method="get">
          <label className="wide">Buscar<input name="q" defaultValue={q} placeholder="Nome, slug ou domínio" /></label>
          <label>Status<select name="status" defaultValue={status}><option value="">Todos</option>{statuses.map((item) => <option key={item} value={item}>{tenantStatusLabels[item]}</option>)}</select></label>
          <label>Plano<select name="plan" defaultValue={plan}><option value="">Todos</option>{plans.map((item) => <option key={item} value={item}>{planLabels[item]}</option>)}</select></label>
          <div className="wide"><button className="admin-primary">Aplicar filtros</button></div>
        </form>
      </section>
      <section className="admin-card table-card">
        {rows.length ? <table><thead><tr><th>Empresa</th><th>Plano</th><th>Usuários</th><th>Imóveis</th><th>Status</th><th>Domínio</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><Link href={"/superadmin/empresas/" + row.id}><strong>{row.name}</strong><small>/empresa/{row.slug}</small></Link></td><td>{planLabels[row.plan] || row.plan}</td><td>{row.users}</td><td>{row.properties}</td><td><StatusBadge value={row.status}/></td><td>{row.domain ? <><strong>{row.domain}</strong><small>{domainStatusLabels[row.domainStatus] || row.domainStatus}</small></> : "Endereço padrão"}</td></tr>)}</tbody></table> : <div className="table-empty roomy"><h2>Nenhuma empresa encontrada</h2><p>Ajuste os filtros ou crie uma nova empresa.</p></div>}
      </section>
    </main>
  );
}
