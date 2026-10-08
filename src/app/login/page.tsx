import type { Metadata } from "next";
import { TenantLoginPage } from "@/components/tenant-login-page";
import { rootTenant } from "@/lib/tenant";
export const metadata:Metadata={title:"Acesso ao painel | Avança Imóveis e Rogério Cortes"};
export default async function LoginPage(){return <TenantLoginPage tenant={await rootTenant()}/>}
