import Link from "next/link";
import { and, count, countDistinct, desc, eq, isNotNull, sql } from "drizzle-orm";
import { BarChart3, Building2, Globe2, Home, Users } from "lucide-react";
import { getDb } from "@/db";
import { analyticsEvents, properties, tenantAuditLogs, tenantMemberships, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { StatusBadge } from "@/components/admin-ui";
import { auditActionLabel, auditEntityLabel, countText, planLabels } from "@/lib/ui-labels";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  await requireSuperAdmin();
  const db = getDb();
  const [[tenantCount], [activeCount], [userCount], [propertyCount], [domainCount], [traffic], recentTenants, recentAudit] = await Promise.all([
    db.select({ value: count() }).from(tenants),
    db.select({ value: count() }).from(tenants).where(eq(tenants.status, "active")),
    db.select({ value: count() }).from(tenantMemberships).where(eq(tenantMemberships.status, "active")),
    db.select({ value: count() }).from(properties),
    db.select({ value: count() }).from(tenants).where(and(eq(tenants.domainStatus, "active"), isNotNull(tenants.customDomain))),
    db.select({ views: count(), visitors: countDistinct(analyticsEvents.anonymousSessionId) }).from(analyticsEvents).where(sql.raw("analytics_events.created_at >= now() - interval '30 days'")),
    db.select({ id: tenants.id, name: tenants.name, slug: tenants.slug, status: tenants.status, plan: tenants.plan }).from(tenants).orderBy(desc(tenants.createdAt)).limit(6),
    db.select({ id: tenantAuditLogs.id, action: tenantAuditLogs.action, entityType: tenantAuditLogs.entityType, createdAt: tenantAuditLogs.createdAt }).from(tenantAuditLogs).orderBy(desc(tenantAuditLogs.createdAt)).limit(8),
  ]);

  return (
    <main className="admin-content">
      <header className="page-header">
        <div>
          <span className="page-eyebrow">Super Admin</span>
          <h1>Visão global da plataforma</h1>
          <p>Métricas consolidadas para operação da plataforma. Cada empresa continua isolada em seu próprio contexto.</p>
        </div>
        <div className="page-header-action"><Link className="admin-button primary" href="/superadmin/empresas/nova">Nova empresa</Link></div>
      </header>

      <section className="metric-grid" aria-label="Indicadores globais">
        <article className="metric-card"><div className="metric-card-top"><span>Empresas</span><Building2 /></div><strong>{tenantCount.value}</strong><small>{countText(Number(activeCount.value), "empresa ativa", "empresas ativas")}</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Usuários ativos</span><Users /></div><strong>{userCount.value}</strong><small>{countText(Number(userCount.value), "acesso ativo", "acessos ativos")}</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Imóveis</span><Home /></div><strong>{propertyCount.value}</strong><small>em todos os tenants</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Domínios ativos</span><Globe2 /></div><strong>{domainCount.value}</strong><small>{countText(Number(domainCount.value), "domínio verificado", "domínios verificados")}</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Tráfego — 30 dias</span><BarChart3 /></div><strong>{traffic.views}</strong><small>{traffic.visitors} visitantes únicos</small></article>
      </section>

      <div className="dashboard-grid">
        <section className="admin-card table-card">
          <div className="card-title" style={{ padding: 18 }}><div><span>Operação</span><h2>Empresas recentes</h2></div><Link href="/superadmin/empresas">Ver todas</Link></div>
          <table>
            <thead><tr><th>Empresa</th><th>Plano</th><th>Status</th></tr></thead>
            <tbody>{recentTenants.map((tenant) => <tr key={tenant.id}><td><Link href={"/superadmin/empresas/" + tenant.id}><strong>{tenant.name}</strong><small>/empresa/{tenant.slug}</small></Link></td><td>{planLabels[tenant.plan] || tenant.plan}</td><td><StatusBadge value={tenant.status}/></td></tr>)}</tbody>
          </table>
        </section>
        <section className="admin-card table-card">
          <div className="card-title" style={{ padding: 18 }}><div><span>Segurança</span><h2>Auditoria recente</h2></div></div>
          {recentAudit.length ? <table><thead><tr><th>Ação</th><th>Quando</th></tr></thead><tbody>{recentAudit.map((entry) => <tr key={entry.id}><td><strong>{auditActionLabel(entry.action)}</strong><small>{auditEntityLabel(entry.entityType)}</small></td><td>{entry.createdAt.toLocaleString("pt-BR")}</td></tr>)}</tbody></table> : <p className="table-empty">Nenhuma ação auditada.</p>}
        </section>
      </div>
    </main>
  );
}
