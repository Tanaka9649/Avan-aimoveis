import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/brand";
import { publicPropertyPath } from "@/lib/property-publication";
import { publishedPropertyRoutes } from "@/lib/public-properties";
import { rootTenant } from "@/lib/tenant";

// Rebuilt from the database, so a property enters the sitemap when it is published and leaves it
// as soon as it is unpublished, paused or sold. Revalidated instead of rendered on every hit.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: siteUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: siteUrl("/imoveis"), changeFrequency: "daily", priority: 0.9 },
    { url: siteUrl("/sobre"), changeFrequency: "yearly", priority: 0.4 },
    { url: siteUrl("/contato"), changeFrequency: "yearly", priority: 0.4 },
  ];
  let listings: MetadataRoute.Sitemap = [];
  try {
    const tenant=await rootTenant();
    listings = tenant ? (await publishedPropertyRoutes(tenant.id)).map((property) => ({
      url: siteUrl(publicPropertyPath(property.slug)),
      lastModified: property.updatedAt ?? undefined,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })) : [];
  } catch (error) {
    // A database blip must not take the whole sitemap down; the static pages still answer.
    console.error("sitemap_properties_failed", error instanceof Error ? error.message : "unknown");
  }
  return [...pages, ...listings];
}
