import { SuperAdminShell } from "@/components/superadmin-shell";
import { requireSuperAdmin } from "@/lib/access";

export const metadata = { title: { absolute: "Super Admin | Plataforma Imobiliária" } };

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return <SuperAdminShell user={{ name: user.name }}>{children}</SuperAdminShell>;
}
