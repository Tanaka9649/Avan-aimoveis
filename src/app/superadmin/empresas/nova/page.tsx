import { PageHeader } from "@/components/admin-ui";
import { TenantWizard } from "@/components/tenant-wizard";
import { requireSuperAdmin } from "@/lib/access";

export default async function NewTenantPage() {
  await requireSuperAdmin();
  return (
    <div className="admin-content">
      <PageHeader eyebrow="Super Admin" title="Nova empresa" description="Configure a empresa, identidade, recursos e administrador em seis etapas." />
      <TenantWizard/>
    </div>
  );
}
