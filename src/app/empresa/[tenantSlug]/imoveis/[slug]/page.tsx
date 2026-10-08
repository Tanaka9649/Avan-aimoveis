import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PublicPropertyView } from "@/components/public-property-view";
import { formatMoney } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { publicProperty, similarProperties } from "@/lib/public-properties";
import { publicPropertyUrl } from "@/lib/property-publication";
import { tenantBySlug, tenantOperational, tenantPublicBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ tenantSlug: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tenantSlug, slug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  const tenant = resolution?.tenant;
  if (!tenant || !tenantOperational(tenant.status)) return { title: "Imóvel não encontrado", robots: { index: false, follow: false } };
  const property = await publicProperty(tenant.id, slug);
  if (!property) return { title: "Imóvel não encontrado", robots: { index: false, follow: false } };
  const baseUrl = tenantPublicBase(tenant);
  const canonical = publicPropertyUrl(property.slug, baseUrl);
  const description = `${property.type} em ${property.neighborhood}, ${property.city}/${property.state} — ${formatMoney(property.priceCents)}. ${property.description.replace(/\s+/g, " ")}`.slice(0, 160);
  const image = property.gallery[0] ? `${baseUrl}${photoUrl(property.gallery[0].id, "medium")}` : undefined;
  return {
    title: `${property.title} — ${property.neighborhood}, ${property.city}`,
    description,
    alternates: { canonical },
    openGraph: { type: "website", url: canonical, siteName: tenant.name, title: `${property.title} — ${formatMoney(property.priceCents)}`, description, locale: "pt_BR", ...(image ? { images: [{ url: image, width: 1280, height: 853, alt: property.title }] } : {}) },
    twitter: { card: image ? "summary_large_image" : "summary", title: property.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function TenantPropertyPage({ params }: Props) {
  const { tenantSlug, slug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}/imoveis/${slug}`);
  const tenant = resolution.tenant;
  if (!tenantOperational(tenant.status)) notFound();
  const property = await publicProperty(tenant.id, slug);
  if (!property) notFound();
  const [similar, baseUrl] = await Promise.all([similarProperties(tenant.id, property), Promise.resolve(tenantPublicBase(tenant))]);
  return <PublicPropertyView property={property} similar={similar} tenant={{ name: tenant.name, slug: tenant.slug, whatsapp: tenant.whatsapp || "", baseUrl, basePath: `/empresa/${tenant.slug}` }}/>;
}
