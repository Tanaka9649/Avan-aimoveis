import { asc } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { SettingsForm } from "@/components/settings-form";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { moduleLabels, modules, type Module } from "@/lib/permissions";
import { formatBytes } from "@/lib/ui-labels";
import { updatePlanDefinition } from "../actions";

const limitLabel: Record<string, string> = {
  max_users: "Usuários",
  max_properties: "Imóveis",
  max_clients: "Clientes",
  max_opportunities: "Oportunidades",
  max_documents: "Documentos",
  max_storage_bytes: "Armazenamento",
  custom_domain: "Domínio personalizado",
};

function limitValue(key: string, value: number | null | undefined) {
  if (key === "custom_domain") return value === 1 ? "Incluído" : "Não incluído";
  if (value == null) return "Ilimitado";
  if (key === "max_storage_bytes") return formatBytes(value);
  return Number(value).toLocaleString("pt-BR");
}
function fieldValue(limits: Record<string, number | null>, key: string) {
  return typeof limits[key] === "number" ? String(limits[key]) : "";
}
function storageGb(limits: Record<string, number | null>) {
  const bytes = limits.max_storage_bytes;
  return typeof bytes === "number" ? String(Number((bytes / 1073741824).toFixed(2))) : "";
}

export default async function PlansPage() {
  await requireSuperAdmin();
  const rows = await getDb().select().from(plans).orderBy(asc(plans.createdAt));

  return (
    <main className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Planos" description="Defina limites e módulos herdados pelas empresas. Reduzir um limite nunca apaga dados existentes."/>
      <div className="sa-plan-grid">
        {rows.map((plan) => (
          <section className="admin-card sa-plan-card" key={plan.code}>
            <header>
              <div><span className="page-eyebrow">{plan.code === "custom" ? "Personalizado" : plan.code}</span><h2>{plan.name}</h2></div>
              <StatusBadge value={plan.active ? "active" : "suspended"}/>
            </header>
            <div className="sa-plan-limits" aria-label={"Limites atuais de " + plan.name}>
              {Object.entries(limitLabel).map(([key, label]) => (
                <div key={key}><span>{label}</span><strong>{limitValue(key, plan.limits[key])}</strong></div>
              ))}
            </div>
            <details className="sa-plan-editor">
              <summary>Editar limites e módulos</summary>
              <SettingsForm action={updatePlanDefinition.bind(null, plan.code)} label="Salvar plano">
                <label>Usuários<input name="max_users" type="number" min="0" defaultValue={fieldValue(plan.limits,"max_users")} placeholder="Ilimitado"/></label>
                <label>Imóveis<input name="max_properties" type="number" min="0" defaultValue={fieldValue(plan.limits,"max_properties")} placeholder="Ilimitado"/></label>
                <label>Clientes<input name="max_clients" type="number" min="0" defaultValue={fieldValue(plan.limits,"max_clients")} placeholder="Ilimitado"/></label>
                <label>Oportunidades<input name="max_opportunities" type="number" min="0" defaultValue={fieldValue(plan.limits,"max_opportunities")} placeholder="Ilimitado"/></label>
                <label>Documentos<input name="max_documents" type="number" min="0" defaultValue={fieldValue(plan.limits,"max_documents")} placeholder="Ilimitado"/></label>
                <label>Armazenamento (GB)<input name="max_storage_gb" type="number" min="0" step="0.1" defaultValue={storageGb(plan.limits)} placeholder="Ilimitado"/></label>
                <label className="wide">Domínio personalizado<select name="custom_domain" defaultValue={plan.limits.custom_domain === 1 ? "1" : "0"}><option value="0">Não incluído</option><option value="1">Incluído</option></select></label>
                <fieldset className="wide"><legend>Módulos incluídos</legend>{modules.map((module) => <label className="check" key={module}><input type="checkbox" name={"module:"+module} defaultChecked={(plan.modules as Module[]).includes(module)}/><span>{moduleLabels[module] || module}</span></label>)}</fieldset>
              </SettingsForm>
            </details>
          </section>
        ))}
      </div>
      <p className="muted-copy sa-page-note">Os planos controlam acesso e limites. Não existe cobrança automática nesta etapa.</p>
    </main>
  );
}
