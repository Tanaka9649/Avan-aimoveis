import { notFound } from "next/navigation";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { SettingsForm } from "@/components/settings-form";
import { getDb } from "@/db";
import {
  analyticsEvents,
  clients,
  deals,
  properties,
  tenantAuditLogs,
  tenantMemberships,
  tenantModules,
  tenantProvisioning,
  tenants,
  users,
} from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { getUsage, tenantEntitlements, type LimitKey } from "@/lib/entitlements";
import { moduleRegistry } from "@/lib/module-registry";
import {
  accessTenant,
  updateTenantIdentity,
  updateTenantLifecycle,
  updateTenantLimits,
  updateTenantModules,
} from "../../actions";

export const dynamic = "force-dynamic";

const limitValue = (overrides: Record<string, number | null>, key: string) => overrides[key] ?? "";
const metadataText = (metadata: Record<string, unknown>) => {
  const value = JSON.stringify(metadata);
  return value.length > 120 ? value.slice(0, 117) + "…" : value;
};

export default async function TenantDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ access?: string }> }) {
  await requireSuperAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
  if (!tenant) notFound();

  const [[memberCount], [propertyCount], [clientCount], [dealCount], [traffic], moduleRows, members, provisioning, audits] = await Promise.all([
    db.select({ value: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, id), eq(tenantMemberships.status, "active"))),
    db.select({ value: count() }).from(properties).where(eq(properties.tenantId, id)),
    db.select({ value: count() }).from(clients).where(eq(clients.tenantId, id)),
    db.select({ value: count() }).from(deals).where(eq(deals.tenantId, id)),
    db.select({ value: count() }).from(analyticsEvents).where(and(eq(analyticsEvents.tenantId, id), sql.raw("analytics_events.created_at >= now() - interval '30 days'"))),
    db.select({ module: tenantModules.module, enabled: tenantModules.enabled }).from(tenantModules).where(eq(tenantModules.tenantId, id)),
    db.select({ id: tenantMemberships.id, name: users.name, email: users.email, role: tenantMemberships.role, status: tenantMemberships.status }).from(tenantMemberships).innerJoin(users, eq(users.id, tenantMemberships.userId)).where(eq(tenantMemberships.tenantId, id)).orderBy(users.name),
    db.select().from(tenantProvisioning).where(eq(tenantProvisioning.tenantId, id)).orderBy(tenantProvisioning.step),
    db.select().from(tenantAuditLogs).where(eq(tenantAuditLogs.tenantId, id)).orderBy(desc(tenantAuditLogs.createdAt)).limit(30),
  ]);
  const enabledModules = new Set(moduleRows.filter((row) => row.enabled).map((row) => row.module));
  const operational = tenant.status === "active" || tenant.status === "trial";
  const [entitlements, userUsage, documentUsage, storageUsage] = await Promise.all([
    tenantEntitlements(id),
    getUsage(id, "max_users"),
    getUsage(id, "max_documents"),
    getUsage(id, "max_storage_bytes"),
  ]);
  const quota = (usage: number, key: LimitKey) => `${usage}/${entitlements?.limits[key] ?? "∞"}`;

  return (
    <main className="admin-content">
      <header className="page-header">
        <div><span className="page-eyebrow">Empresa</span><h1>{tenant.name}</h1><p>/empresa/{tenant.slug} · {tenant.plan} · {tenant.status}</p></div>
        <div className="page-header-action">
          <form action={accessTenant}>
            <input type="hidden" name="tenantId" value={tenant.id} />
            <button className="admin-button primary" disabled={!operational}>Acessar como empresa</button>
          </form>
        </div>
      </header>
      {query.access === "indisponivel" ? <p className="admin-form-error" role="alert">Reative a empresa antes de acessar o contexto operacional.</p> : null}

      <section className="metric-grid" aria-label="Uso da empresa">
        <article className="metric-card"><div className="metric-card-top"><span>Usuários</span></div><strong>{quota(userUsage, "max_users")}</strong><small>{memberCount.value} membership(s) ativa(s), incluindo quota de convites</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Imóveis</span></div><strong>{quota(Number(propertyCount.value), "max_properties")}</strong><small>dados preservados</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Clientes</span></div><strong>{quota(Number(clientCount.value), "max_clients")}</strong><small>somente deste tenant</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Oportunidades</span></div><strong>{quota(Number(dealCount.value), "max_opportunities")}</strong><small>pipeline isolado</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Documentos</span></div><strong>{quota(documentUsage, "max_documents")}</strong><small>imóveis e oportunidades</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Armazenamento</span></div><strong>{quota(storageUsage, "max_storage_bytes")}</strong><small>bytes reservados</small></article>
        <article className="metric-card"><div className="metric-card-top"><span>Eventos — 30 dias</span></div><strong>{traffic.value}</strong><small>analytics público</small></article>
      </section>

      <section className="admin-card">
        <h2>Identidade</h2><p>Nome, contatos e endereço público. Mudanças de slug preservam histórico para redirecionamento.</p>
        <SettingsForm action={updateTenantIdentity.bind(null, tenant.id)} label="Salvar identidade">
          <label>Nome<input name="name" defaultValue={tenant.name} required /></label>
          <label>Slug<input name="slug" defaultValue={tenant.slug} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
          <label>E-mail<input name="email" type="email" defaultValue={tenant.email ?? ""} /></label>
          <label>Telefone<input name="phone" defaultValue={tenant.phone ?? ""} /></label>
          <label className="wide">WhatsApp<input name="whatsapp" defaultValue={tenant.whatsapp ?? ""} /></label>
        </SettingsForm>
      </section>

      <section className="admin-card">
        <h2>Plano e ciclo de vida</h2><p>Suspender ou cancelar invalida as sessões, bloqueia a operação e preserva todos os dados.</p>
        <SettingsForm action={updateTenantLifecycle.bind(null, tenant.id)} label="Atualizar plano e status">
          <label>Status<select name="status" defaultValue={tenant.status}><option value="configuring">Configurando</option><option value="trial">Trial</option><option value="active">Ativa</option><option value="suspended">Suspensa</option><option value="cancelled">Cancelada</option></select></label>
          <label>Plano<select name="plan" defaultValue={tenant.plan}><option value="starter">Starter</option><option value="pro">Pro</option><option value="max">Max</option><option value="custom">Custom</option></select></label>
        </SettingsForm>
      </section>

      <section className="admin-card">
        <h2>Overrides de limites</h2><p>Campos vazios significam ilimitado. O sistema nunca apaga dados em downgrade ou overage.</p>
        <SettingsForm action={updateTenantLimits.bind(null, tenant.id)} label="Salvar limites">
          <label>Máximo de usuários<input name="max_users" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_users")} /></label>
          <label>Máximo de imóveis<input name="max_properties" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_properties")} /></label>
          <label>Máximo de clientes<input name="max_clients" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_clients")} /></label>
          <label>Máximo de oportunidades<input name="max_opportunities" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_opportunities")} /></label>
          <label>Máximo de documentos<input name="max_documents" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_documents")} /></label>
          <label>Armazenamento em bytes<input name="max_storage_bytes" type="number" min="0" defaultValue={limitValue(tenant.quotaOverrides, "max_storage_bytes")} /></label>
          <label className="wide">Domínio personalizado<select name="custom_domain" defaultValue={tenant.quotaOverrides.custom_domain === 1 ? "1" : "0"}><option value="0">Não permitido</option><option value="1">Permitido</option></select></label>
        </SettingsForm>
      </section>

      <section className="admin-card">
        <h2>Módulos</h2><p>Disponibilidade final ainda depende do plano e das permissões do usuário.</p>
        <SettingsForm action={updateTenantModules.bind(null, tenant.id)} label="Salvar módulos">
          {moduleRegistry.map((definition) => <label className="check" key={definition.key}><input type="checkbox" name={"module:" + definition.key} defaultChecked={enabledModules.has(definition.key)} /><span><strong>{definition.label}</strong><br /><small>{definition.description}{definition.dependencies.length ? " · depende de " + definition.dependencies.join(", ") : ""}</small></span></label>)}
        </SettingsForm>
      </section>

      <div className="dashboard-grid">
        <section className="admin-card table-card">
          <div className="card-title" style={{ padding: 18 }}><div><span>Acesso</span><h2>Usuários</h2></div></div>
          {members.length ? <table><thead><tr><th>Usuário</th><th>Papel</th><th>Status</th></tr></thead><tbody>{members.map((member) => <tr key={member.id}><td><strong>{member.name}</strong><small>{member.email}</small></td><td>{member.role}</td><td>{member.status}</td></tr>)}</tbody></table> : <p className="table-empty">Nenhum usuário ativo.</p>}
        </section>
        <section className="admin-card">
          <h2>Domínio e site</h2>
          <p><strong>Endereço padrão:</strong><br />{tenant.standardDomain ?? "/empresa/" + tenant.slug}</p>
          <p><strong>Domínio personalizado:</strong><br />{tenant.customDomain ?? "Não configurado"}</p>
          <p><strong>Status:</strong> {tenant.domainStatus}</p>
          <p>Branding, site e DNS podem ser gerenciados no contexto da empresa usando o acesso administrativo auditado.</p>
        </section>
      </div>

      <section className="admin-card table-card">
        <div className="card-title" style={{ padding: 18 }}><div><span>Provisionamento</span><h2>Checklist idempotente</h2></div></div>
        {provisioning.length ? <table><thead><tr><th>Etapa</th><th>Status</th><th>Tentativas</th><th>Último erro</th></tr></thead><tbody>{provisioning.map((step) => <tr key={step.step}><td>{step.step}</td><td>{step.status}</td><td>{step.attempts}</td><td>{step.lastError ?? "—"}</td></tr>)}</tbody></table> : <p className="table-empty">Tenant legado migrado sem checklist de provisionamento.</p>}
      </section>

      <section className="admin-card table-card">
        <div className="card-title" style={{ padding: 18 }}><div><span>Segurança</span><h2>Auditoria</h2></div></div>
        {audits.length ? <table><thead><tr><th>Ação</th><th>Entidade</th><th>Metadados</th><th>Quando</th></tr></thead><tbody>{audits.map((entry) => <tr key={entry.id}><td>{entry.action}</td><td>{entry.entityType}</td><td><small>{metadataText(entry.metadata)}</small></td><td>{entry.createdAt.toLocaleString("pt-BR")}</td></tr>)}</tbody></table> : <p className="table-empty">Nenhuma ação auditada.</p>}
      </section>
    </main>
  );
}
