import type { Metadata } from "next";
import { Catalog } from "@/components/catalog";
export const metadata: Metadata = { title: "Imóveis", description: "Encontre apartamentos, casas, coberturas e studios selecionados em São Paulo." };
export default function PropertiesPage(){return <section className="section page-top shell"><div className="catalog-title"><span className="eyebrow">Portfólio</span><h1>Encontre seu próximo imóvel</h1><p>Use os filtros para chegar às opções que combinam com seu momento.</p></div><Catalog/></section>}
