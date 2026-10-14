import { ROOT_TENANT_ID } from "@/lib/tenant-routing";
import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Manrope } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { AnalyticsTracker } from "@/components/analytics-tracker";
import { tenantForRequest, tenantPublicBase, tenantPublicPathBase } from "@/lib/tenant";
import "./globals.css";
import "./evolution.css";
import "./admin-refinement.css";
import "./public-site.css";
import "./login/login.css";
import "./brand-logos.css";
import "./internal-polish.css";

const sans = Manrope({ subsets: ["latin"], variable: "--font-sans" });

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await tenantForRequest();
  if (!tenant) return { title: "Site indisponível", robots: { index: false, follow: false } };
  const site = tenant.site || {};
  const baseUrl = tenantPublicBase(tenant);
  return {
    metadataBase: new URL(baseUrl),
    title: { default: site.title || `${tenant.name} — imóveis selecionados`, template: `%s | ${tenant.name}` },
    description: site.description || "Imóveis escolhidos com critério. Negócios conduzidos com clareza.",
    icons: { icon: tenant.branding?.favicon || (tenant.id === ROOT_TENANT_ID ? "/icon.png" : "/platform-icon.svg"), apple: tenant.branding?.favicon || (tenant.id === ROOT_TENANT_ID ? "/apple-icon.png" : "/platform-icon.svg") },
    alternates: { canonical: baseUrl },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  const basePath = tenantPublicPathBase(tenant);
  const palette = {
    ...(tenant.site?.primaryColor ? { "--tenant-primary": tenant.site.primaryColor } : {}),
    ...(tenant.site?.secondaryColor ? { "--tenant-secondary": tenant.site.secondaryColor } : {}),
    ...(tenant.site?.accentColor ? { "--tenant-accent": tenant.site.accentColor } : {}),
  } as CSSProperties;
  return (
    <html lang="pt-BR">
      <body className={sans.variable} style={palette}>
        <AnalyticsTracker tenantSlug={tenant.slug}/>
        <SiteHeader tenant={{name:tenant.name,slug:tenant.slug,branding:tenant.branding}} basePath={basePath}/>
        <main>{children}</main>
        <SiteFooter tenant={tenant} basePath={basePath}/>
      </body>
    </html>
  );
}
