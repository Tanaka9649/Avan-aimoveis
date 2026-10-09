import { asc } from "drizzle-orm";
import { PageHeader, StatusBadge } from "@/components/admin-ui";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { moduleLabels, type Module } from "@/lib/permissions";
import { formatBytes } from "@/lib/ui-labels";

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
  if (key === "custom_domain") return value === 0 ? "Não incluído" : "Incluído";
  if (value == null) return "Ilimitado";
  if (key === "max_storage_bytes") return formatBytes(value);
  return Number(value).toLocaleString("pt-BR");
}

export default async function PlansPage() {
  await requireSuperAdmin();
  const rows = await getDb().select().from(plans).orderBy(asc(plans.createdAt));

  return (
    <main className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Planos" description="Consulte os recursos e limites usados pelo motor de permissões da plataforma."/>
      <div className="sa-plan-grid">
        {rows.map((plan) => (
          <section className="admin-card sa-plan-card" key={plan.code}>
            <header>
              <div><span className="page-eyebrow">{plan.code}</span><h2>{plan.name}</h2></div>
              <StatusBadge value={plan.active ? "active" : "suspended"}/>
            </header>
            <div className="sa-plan-limits">
              {Object.entries(limitLabel).map(([key, label]) => (
                <div key={key}><span>{label}</span><strong>{limitValue(key, plan.limits[key])}</strong></div>
              ))}
            </div>
            <div className="sa-plan-modules">
              <span>Módulos incluídos</span>
              <div>{(plan.modules as Module[]).map((module) => <small key={module}>{moduleLabels[module] || module}</small>)}</div>
            </div>
          </section>
        ))}
      </div>
      <p className="muted-copy sa-page-note">Os planos controlam acesso e limites. Faturamento automático não faz parte desta etapa do produto.</p>
    </main>
  );
}
