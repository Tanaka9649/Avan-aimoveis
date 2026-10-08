import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Catalog } from "@/components/catalog";
import { publicPropertyCards } from "@/lib/public-properties";
import { tenantForRequest, tenantPublicPathBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imóveis", description: "Encontre seu próximo imóvel." };

export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  const [properties, params] = await Promise.all([publicPropertyCards(tenant.id), searchParams]);
  const initial = Object.fromEntries(["q", "type", "city", "neighborhood", "bedrooms", "max"].map((key) => [key, typeof params[key] === "string" ? params[key] : ""]));
  return (
    <section className="section page-top shell">
      <div className="catalog-title">
        <span className="eyebrow">Portfólio</span>
        <h1>Encontre o imóvel ideal</h1>
        <p>Use os filtros para encontrar opções que combinam com o que você procura.</p>
      </div>
      <Catalog key={JSON.stringify(initial)} properties={properties} initial={initial} basePath={tenantPublicPathBase(tenant)} tenantKey={tenant.slug}/>
    </section>
  );
}
