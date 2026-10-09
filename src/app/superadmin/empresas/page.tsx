import Link from "next/link";
import { and, count, countDistinct, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { getDb } from "@/db";
import { properties, tenantMemberships, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { StatusBadge } from "@/components/admin-ui";
import { Pagination } from "@/components/list-tools";
import { PAGE_SIZE, pageNumber, type Query } from "@/lib/list-query";
import { domainStatusLabels, planLabels, tenantStatusLabels } from "@/lib/ui-labels";

const statuses = ["configuring", "trial", "active", "suspended", "cancelled"] as const;
const plans = ["starter", "pro", "max", "custom"] as const;
const single = (value: string | string[] | undefined) => typeof value === "string" ? value : "";

export default async function TenantsPage({ searchParams }: { searchParams: Promise<Query> }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const q = single(params.q).trim();
  const status = single(params.status);
  const plan = single(params.plan);
  const page = pageNumber(params);
  const filters: SQL[] = [];

  if (q) filters.push(or(ilike(tenants.name, "%" + q + "%"), ilike(tenants.slug, "%" + q + "%"), ilike(tenants.customDomain, "%" + q + "%"))!);
  if (statuses.includes(status as typeof statuses[number])) filters.push(eq(tenants.status, status as typeof statuses[number]));
  if (plans.includes(plan as typeof plans[number])) filters.push(eq(tenants.plan, plan));

  const where = and(...filters);
  const db = getDb();
  const [[totalRow], rows] = await Promise.all([
    db.select({ value: count() }).from(tenants).where(where),
    db.select({
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
      .where(where)
      .groupBy(tenants.id)
      .orderBy(desc(tenants.updatedAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
  ]);
  const total = Number(totalRow.value);

  return (
    <main className="admin-content">
      <header className="page-header">
        <div><span className="page-eyebrow">Super Admin</span><h1>Empresas</h1><p>Busca, filtros e indicadores consolidados sem misturar dados operacionais.</p></div>
        <div className="page-header-action"><Link className="admin-button primary" href="/superadmin/empresas/nova">Nova empresa</Link></div>
      </header>

      <section className="admin-card">
        <form className="entity-form" method="get">
          <label className="wide">Buscar<input name="q" defaultValue={q} placeholder="Nome, endereço ou domínio" /></label>
          <label>Status<select name="status" defaultValue={status}><option value="">Todos</option>{statuses.map((item) => <option key={item} value={item}>{tenantStatusLabels[item]}</option>)}</select></label>
          <label>Plano<select name="plan" defaultValue={plan}><option value="">Todos</option>{plans.map((item) => <option key={item} value={item}>{planLabels[item]}</option>)}</select></label>
          <div className="wide filter-actions"><button className="admin-button primary">Aplicar filtros</button>{q || status || plan ? <Link className="admin-button secondary" href="/superadmin/empresas">Limpar</Link> : null}</div>
        </form>
      </section>

      <section className="admin-card table-card">
        {rows.length ? <div className="table-scroll"><table>
          <thead><tr><th>Empresa</th><th>Plano</th><th>Usuários</th><th>Imóveis</th><th>Status</th><th>Domínio</th><th>Ação</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id}>
            <td><Link href={"/superadmin/empresas/" + row.id}><strong>{row.name}</strong><small>/empresa/{row.slug}</small></Link></td>
            <td>{planLabels[row.plan] || row.plan}</td>
            <td>{Number(row.users).toLocaleString("pt-BR")}</td>
            <td>{Number(row.properties).toLocaleString("pt-BR")}</td>
            <td><StatusBadge value={row.status}/></td>
            <td>{row.domain ? <><strong>{row.domain}</strong><small>{domainStatusLabels[row.domainStatus] || row.domainStatus}</small></> : <span className="muted-copy">Endereço padrão</span>}</td>
            <td><Link className="admin-button secondary compact" href={"/superadmin/empresas/" + row.id}>Abrir</Link></td>
          </tr>)}</tbody>
        </table></div> : <div className="table-empty roomy"><h2>Nenhuma empresa encontrada</h2><p>Ajuste os filtros ou crie uma nova empresa.</p></div>}
      </section>
      <Pagination query={params} page={page} total={total} size={PAGE_SIZE}/>
    </main>
  );
}
