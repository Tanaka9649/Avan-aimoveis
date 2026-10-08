import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import { tenantOperational, type TenantRecord } from "@/lib/tenant";

export function TenantLoginPage({ tenant }: { tenant: TenantRecord | null }) {
  if (!tenant || !tenantOperational(tenant.status)) notFound();
  return <section className="login-page">
    <div className="login-copy" style={{ "--tenant-accent": tenant.site.accentColor || tenant.site.primaryColor || "#2563eb" } as React.CSSProperties}>
      <BrandLogo light name={tenant.name} branding={tenant.branding}/>
      <span>{tenant.name.toUpperCase()}</span>
      <blockquote>“Uma operação organizada cria espaço para relações melhores.”</blockquote>
    </div>
    <LoginForm tenantSlug={tenant.slug} tenantName={tenant.name}/>
  </section>;
}
