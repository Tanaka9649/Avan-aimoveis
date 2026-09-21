import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
import { publicPropertyCards } from "@/lib/public-properties";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Imóveis", description: "Encontre seu próximo imóvel." };
export default async function PropertiesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [properties, params] = await Promise.all([publicPropertyCards(), searchParams]);
  const initial = Object.fromEntries(["q", "type", "city", "neighborhood", "bedrooms", "max"].map((key) => [key, typeof params[key] === "string" ? params[key] : ""]));
  return <section className="section page-top shell"><div className="catalog-title"><span className="eyebrow">Portfólio</span><h1>Encontre seu próximo imóvel</h1><p>Use os filtros para buscar nos imóveis publicados. Até 200 anúncios recentes.</p></div><Catalog key={JSON.stringify(initial)} properties={properties} initial={initial}/></section>;
}
