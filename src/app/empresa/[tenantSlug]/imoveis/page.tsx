import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imóveis", description: "Encontre seu próximo imóvel." };

export default async function TenantPropertiesPage({ params, searchParams }: { params: Promise<{ tenantSlug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ tenantSlug }, query] = await Promise.all([params, searchParams]);
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}/imoveis`);
  const tenant = resolution.tenant;
  if (!tenantOperational(tenant.status)) notFound();
  const properties = await publicPropertyCards(tenant.id);
  const initial = Object.fromEntries(["q", "type", "city", "neighborhood", "bedrooms", "max"].map((key) => [key, typeof query[key] === "string" ? query[key] : ""]));
  const basePath = `/empresa/${tenant.slug}`;
  return <section className="section page-top shell"><div className="catalog-title"><span className="eyebrow">Portfólio</span><h1>Encontre o imóvel ideal</h1><p>Use os filtros para encontrar opções que combinam com o que você procura.</p></div><Catalog key={JSON.stringify(initial)} properties={properties} initial={initial} basePath={basePath} tenantKey={tenant.slug}/></section>;
}
