import { and, asc, eq } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { SettingsForm } from "@/components/settings-form";
import { BrandLogosEditor } from "@/components/brand-logos-editor";
import { BrandingSettingsTabs } from "@/components/branding-settings-tabs";
import { AdminSectionTabs } from "@/components/admin-section-tabs";
import { DomainVerificationButton } from "@/components/domain-verification-button";
import { TenantInviteForm } from "@/components/tenant-invite-form";
import { getDb } from "@/db";
import { plans, reminderSettings, tenantMemberships, tenantModules, tenants, users } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { moduleRegistry } from "@/lib/module-registry";
import { moduleLabels, modules } from "@/lib/permissions";
import { brandingLogos } from "@/lib/branding";
import { createAccount, saveCustomDomain, saveReminders, saveTenantBranding, saveTenantLogos, saveTenantModules, updateAccount } from "./actions";

export default async function SettingsPage() {
  const admin = await requireAdmin();
  const db = getDb();
  const [team, preferences, tenantRows, planRows, tenantModuleRows] = await Promise.all([
    db.select({
      id: tenantMemberships.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: tenantMemberships.role,
      status: tenantMemberships.status,
      access: tenantMemberships.permissions,
    }).from(tenantMemberships).innerJoin(users, eq(users.id, tenantMemberships.userId)).where(eq(tenantMemberships.tenantId, admin.tenantId)).orderBy(asc(users.name)),
    db.select().from(reminderSettings).where(and(eq(reminderSettings.tenantId, admin.tenantId), eq(reminderSettings.key, "visits"))).limit(1),
    db.select().from(tenants).where(eq(tenants.id, admin.tenantId)).limit(1),
    db.select({ modules: plans.modules, limits: plans.limits }).from(tenants).leftJoin(plans, eq(plans.code, tenants.plan)).where(eq(tenants.id, admin.tenantId)).limit(1),
    db.select({ module: tenantModules.module, enabled: tenantModules.enabled }).from(tenantModules).where(eq(tenantModules.tenantId, admin.tenantId)),
  ]);
  const settings = preferences[0];
  const tenant = tenantRows[0];
  if (!tenant) return null;
  const site = tenant.site || {};
  const branding = tenant.branding || {};
  const allowedModules = modules.filter((module) => (planRows[0]?.modules || []).includes(module));
  const enabledModules = new Set(tenantModuleRows.filter((row) => row.enabled).map((row) => row.module));
  const customDomainOverride = tenant.quotaOverrides?.custom_domain;
  const planCustomDomain = planRows[0]?.limits?.custom_domain;
  const customDomainAllowed = typeof customDomainOverride === "number"
    ? customDomainOverride === 1
    : planCustomDomain !== 0;

  const companySection = (
    <section className="admin-card">
      <h2>Empresa e site</h2>
      <p>Dados, identidade visual e informações públicas de {tenant.name}.</p>
      <BrandingSettingsTabs
        details={
          <SettingsForm action={saveTenantBranding} label="Salvar dados e site">
            <label>Nome da empresa<input name="name" required minLength={2} defaultValue={tenant.name}/></label>
            <label>Telefone<input name="phone" defaultValue={tenant.phone || ""}/></label>
            <label>WhatsApp<input name="whatsapp" defaultValue={tenant.whatsapp || ""}/></label>
            <label>E-mail<input name="email" type="email" defaultValue={tenant.email || ""}/></label>
            <label>Cor principal<input name="primaryColor" type="color" defaultValue={site.primaryColor || "#111827"}/></label>
            <label>Cor secundária<input name="secondaryColor" type="color" defaultValue={site.secondaryColor || "#334155"}/></label>
            <label>Cor de destaque<input name="accentColor" type="color" defaultValue={site.accentColor || "#3b82f6"}/></label>
            <label className="wide">Título do site<input name="siteTitle" maxLength={180} defaultValue={site.title || ""}/></label>
            <label className="wide">Descrição para SEO<textarea name="siteDescription" maxLength={320} defaultValue={site.description || ""}/></label>
          </SettingsForm>
        }
        logos={
          <SettingsForm action={saveTenantLogos} label="Salvar logos">
            <BrandLogosEditor initialLogos={brandingLogos(branding)}/>
            <label className="wide">Favicon — URL<input name="favicon" type="url" defaultValue={branding.favicon || ""}/></label>
          </SettingsForm>
        }
      />
    </section>
  );

  const domainSection = (
    <section className="admin-card">
      <h2>Domínio personalizado</h2>
      {customDomainAllowed ? (
        <>
          <p>Use um domínio próprio para o site desta empresa. Depois de salvar, a plataforma verifica a configuração de DNS antes de ativá-lo.</p>
          <SettingsForm action={saveCustomDomain} label="Salvar domínio">
            <label className="wide">Domínio<input name="customDomain" placeholder="imoveis.suaempresa.com.br" defaultValue={tenant.customDomain || ""}/></label>
            <div className="wide">{tenant.customDomain ? <StatusBadge value={tenant.domainStatus}/> : <span className="muted-copy">Nenhum domínio personalizado configurado.</span>}</div>
          </SettingsForm>
          {tenant.customDomain ? <DomainVerificationButton/> : null}
        </>
      ) : (
        <div className="settings-info-state">
          <strong>Recurso não incluído no plano atual</strong>
          <p>O endereço padrão da empresa continua funcionando normalmente. O Super Admin pode liberar domínio personalizado pelo plano ou por um limite específico.</p>
        </div>
      )}
    </section>
  );

  const teamSection = (
    <>
      <section className="admin-card">
        <h2>Convidar pessoa</h2>
        <p>A pessoa recebe um link temporário e define a própria senha. O link expira em sete dias.</p>
        <TenantInviteForm action={createAccount}/>
      </section>

      <section className="admin-card">
        <h2>Contas e permissões</h2>
        <p>{team.length} {team.length === 1 ? "conta cadastrada" : "contas cadastradas"} nesta empresa.</p>
        {team.map((person) => {
          const isAdmin = person.role === "owner" || person.role === "admin";
          return <article key={person.id} className="account-settings">
            <header className="account-heading"><div><h3>{person.name}</h3><p>{person.email}</p></div><StatusBadge value={isAdmin ? "administrador" : person.status}/></header>
            {!isAdmin ? <SettingsForm action={updateAccount} label="Salvar acesso">
              <input type="hidden" name="id" value={person.id}/>
              <label className="check"><input type="checkbox" name="active" defaultChecked={person.status === "active"}/>Acesso aprovado</label>
              <label>Clientes visíveis<select name="scope" defaultValue={person.access.clients}><option value="all">Todos os clientes disponíveis</option><option value="own">Somente clientes atribuídos</option></select></label>
              <fieldset className="wide"><legend>Módulos liberados</legend>{modules.map((module) => <label className="check" key={module}><input type="checkbox" name="modules" value={module} defaultChecked={person.access.modules.includes(module)}/>{moduleLabels[module]}</label>)}</fieldset>
            </SettingsForm> : null}
          </article>;
        })}
      </section>

    </>
  );

  const modulesSection = (
    <section className="admin-card">
      <h2>Módulos da empresa</h2>
      <p>Escolha quais recursos incluídos no plano ficam disponíveis para a equipe. Dependências precisam permanecer ativas.</p>
      <SettingsForm action={saveTenantModules} label="Salvar módulos">
        <fieldset className="wide">
          <legend>Recursos habilitados</legend>
          {moduleRegistry.filter((definition) => allowedModules.includes(definition.key)).map((definition) => (
            <label className="check" key={definition.key}>
              <input type="checkbox" name={`module:${definition.key}`} defaultChecked={enabledModules.has(definition.key)}/>
              <span><strong>{moduleLabels[definition.key]}</strong><small>{definition.description}</small></span>
            </label>
          ))}
        </fieldset>
      </SettingsForm>
    </section>
  );

  const preferencesSection = (
    <>
      <section className="admin-card">
        <h2>Lembretes de visitas</h2>
        <SettingsForm action={saveReminders} label="Salvar preferências">
          <label className="check"><input name="panel" type="checkbox" defaultChecked={settings?.panel ?? true}/>No painel</label>
          <label className="check"><input name="email" type="checkbox" defaultChecked={settings?.email ?? true}/>Por e-mail</label>
          <label className="wide">Destinatários — um por linha (até 50)<textarea name="recipients" rows={4} required defaultValue={(settings?.recipients ?? [admin.email]).join("\n")}/></label>
        </SettingsForm>
      </section>
      <section className="admin-card">
        <h2>Exportação da empresa</h2>
        <p>Baixe uma cópia JSON dos dados desta empresa. Senhas, sessões e tokens de convite não entram no arquivo.</p>
        <a className="admin-button secondary" href="/api/tenant/export" download>Baixar exportação</a>
      </section>
    </>
  );

  return (
    <div className="admin-content">
      <PageHeader eyebrow="Administração" title="Configurações da empresa" description="Gerencie identidade, domínio, equipe, módulos e preferências operacionais." />
      <AdminSectionTabs items={[
        { id: "empresa", label: "Empresa e site", content: companySection },
        { id: "dominio", label: "Domínio", content: domainSection },
        { id: "equipe", label: "Equipe e acessos", content: teamSection },
        { id: "modulos", label: "Módulos", content: modulesSection },
        { id: "preferencias", label: "Preferências", content: preferencesSection },
      ]}/>
    </div>
  );
}
