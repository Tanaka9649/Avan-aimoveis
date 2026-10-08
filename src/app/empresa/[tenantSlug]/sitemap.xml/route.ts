import { NextResponse } from "next/server";
import { publicPropertyPath } from "@/lib/property-publication";
import { publishedPropertyRoutes } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational, tenantPublicBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

export async function GET(_request: Request, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  const tenant = resolution?.tenant;
  if (!tenant || !tenantOperational(tenant.status) || resolution.redirectSlug) {
    return new NextResponse("Not found", { status: 404 });
  }

  const base = tenantPublicBase(tenant);
  const staticUrls = [base + "/", base + "/imoveis", base + "/sobre", base + "/contato"];
  const properties = await publishedPropertyRoutes(tenant.id);
  const entries = [
    ...staticUrls.map((url) => "<url><loc>" + escapeXml(url) + "</loc></url>"),
    ...properties.map((property) => {
      const location = escapeXml(publicPropertyPath(property.slug, base));
      const lastModified = property.updatedAt ? "<lastmod>" + property.updatedAt.toISOString() + "</lastmod>" : "";
      return "<url><loc>" + location + "</loc>" + lastModified + "</url>";
    }),
  ];
  const xml = '<?xml version="1.0" encoding="UTF-8"?>' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    entries.join("") +
    "</urlset>";
  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
