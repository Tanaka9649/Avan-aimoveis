import { TenantWizard } from "@/components/tenant-wizard";
import { requireSuperAdmin } from "@/lib/access";
export default async function NewTenantPage(){await requireSuperAdmin();return <div className="admin-content"><header><span className="eyebrow">Super Admin</span><h1>Nova empresa</h1><p>Provisionamento seguro em seis etapas.</p></header><TenantWizard/></div>}
