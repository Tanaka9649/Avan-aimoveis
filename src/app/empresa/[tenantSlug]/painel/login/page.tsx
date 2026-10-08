import type { Metadata } from "next";
import { TenantLoginPage } from "@/components/tenant-login-page";
import { tenantBySlug } from "@/lib/tenant";

export async function generateMetadata({ params }: { params: Promise<{ tenantSlug: string }> }): Promise<Metadata> {
  const { tenantSlug } = await params;
  const resolved = await tenantBySlug(tenantSlug);
  return { title: resolved ? `Acesso ao painel | ${resolved.tenant.name}` : "Empresa não encontrada" };
}
export default async function ScopedLoginPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolved = await tenantBySlug(tenantSlug);
  return <TenantLoginPage tenant={resolved?.tenant || null}/>;
}
