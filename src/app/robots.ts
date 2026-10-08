import type { MetadataRoute } from "next";
import { tenantForRequest, tenantPublicBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await tenantForRequest();
  if (!tenant) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/painel/", "/api/", "/superadmin/"] }],
    sitemap: `${tenantPublicBase(tenant)}/sitemap.xml`,
  };
}
