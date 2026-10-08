import { PublicPropertyView } from "@/components/public-property-view";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicProperty, similarProperties } from "@/lib/public-properties";
import { formatMoney } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { publicPropertyUrl } from "@/lib/property-publication";
import { tenantForRequest, tenantPublicBase, tenantPublicPathBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await tenantForRequest();
  const property = tenant ? await publicProperty(tenant.id, slug) : null;
  if (!property || !tenant) return { title: "Imóvel não encontrado", robots: { index: false, follow: false } };
  const description = `${property.type} em ${property.neighborhood}, ${property.city}/${property.state} — ${formatMoney(property.priceCents)}. ${property.description.replace(/\s+/g, " ")}`.slice(0, 160);
  const baseUrl = tenantPublicBase(tenant);
  const image = property.gallery[0] ? `${baseUrl}${photoUrl(property.gallery[0].id, "medium")}` : undefined;
  const canonical = publicPropertyUrl(property.slug, baseUrl);
  return {
    title: `${property.title} — ${property.neighborhood}, ${property.city}`,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      siteName: tenant.name,
      title: `${property.title} — ${formatMoney(property.priceCents)}`,
      description,
      locale: "pt_BR",
      ...(image ? { images: [{ url: image, width: 1280, height: 853, alt: property.title }] } : {}),
    },
    twitter: { card: image ? "summary_large_image" : "summary", title: property.title, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const tenant = await tenantForRequest();
  const property = tenant ? await publicProperty(tenant.id, slug) : null;
  if (!property || !tenant) notFound();
  const similar = await similarProperties(tenant.id, property);
  return <PublicPropertyView property={property} similar={similar} tenant={{ name: tenant.name, whatsapp: tenant.whatsapp || "", baseUrl: tenantPublicBase(tenant), basePath: tenantPublicPathBase(tenant) }}/>;
}
