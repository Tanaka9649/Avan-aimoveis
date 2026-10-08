import type { MetadataRoute } from "next";
import { publicPropertyPath } from "@/lib/property-publication";
import { publishedPropertyRoutes } from "@/lib/public-properties";
import { tenantForRequest, tenantPublicBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const tenant = await tenantForRequest();
  if (!tenant) return [];
  const baseUrl = tenantPublicBase(tenant);
  const pages: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "daily", priority: 1 },
    { url: `${baseUrl}/imoveis`, changeFrequency: "daily", priority: 0.9 },
    { url: `${baseUrl}/sobre`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/contato`, changeFrequency: "yearly", priority: 0.4 },
  ];
  try {
    const listings = (await publishedPropertyRoutes(tenant.id)).map((property) => ({
      url: publicPropertyPath(property.slug, baseUrl),
      lastModified: property.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));
    return [...pages, ...listings];
  } catch (error) {
    console.error("sitemap_properties_failed", error instanceof Error ? error.message : "unknown");
    return pages;
  }
}
