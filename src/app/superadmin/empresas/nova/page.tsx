import { PageHeader } from "@/components/admin-ui";
import { TenantWizard } from "@/components/tenant-wizard";
import { requireSuperAdmin } from "@/lib/access";
import { getDb } from "@/db";
import { plans } from "@/db/schema";
import { isPlanConfigured } from "@/lib/plan-configuration";

export default async function NewTenantPage() {
  await requireSuperAdmin();
  const catalog = (await getDb().select().from(plans)).map((plan) => ({code: plan.code, name: plan.name, modules: plan.modules, configured: plan.active && isPlanConfigured(plan.limits)}));
  return (
    <div className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Nova empresa" description="Configure a empresa, identidade, recursos e administrador em seis etapas." />
      <TenantWizard plans={catalog}/>
    </div>
  );
}
