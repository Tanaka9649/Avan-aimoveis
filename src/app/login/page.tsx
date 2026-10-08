import type { Metadata } from "next";
import { TenantLoginPage } from "@/components/tenant-login-page";
import { tenantForRequest } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await tenantForRequest();
  return { title: tenant ? `Acesso ao painel | ${tenant.name}` : "Empresa não encontrada" };
}

export default async function LoginPage() {
  return <TenantLoginPage tenant={await tenantForRequest()}/>;
}
