import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { publicProperties } from "@/lib/public-properties";
import { formatArea, formatMoney } from "@/lib/format";
import { LeadForm } from "@/components/lead-form";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await publicProperties(slug))[0];
  return p ? { title: p.title, description: p.description.slice(0, 155) } : { title: "Imóvel não encontrado" };
}
export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const p = (await publicProperties(slug))[0];
  if (!p) notFound();
  return <>
    <section className="detail-top shell"><Link href="/imoveis">← Todos os imóveis</Link><div className="detail-title"><div><span className="eyebrow">{p.type} · {p.code}</span><h1>{p.title}</h1><p>{p.neighborhood}, {p.city} — {p.state}</p></div></div></section>
    <section className="gallery shell"><div className="gallery-main"><Image src={p.image} alt={p.title} fill priority sizes="(max-width: 760px) 100vw, 70vw"/></div></section>
    <section className="detail-layout shell"><article><div className="detail-price"><span>Valor do imóvel</span><strong>{formatMoney(p.priceCents)}</strong></div><div className="spec-grid"><div><strong>{p.bedrooms}</strong><span>quartos</span></div><div><strong>{p.bathrooms}</strong><span>banheiros</span></div><div><strong>{p.parkingSpaces}</strong><span>vagas</span></div><div><strong>{formatArea(p.area)}</strong><span>área privativa</span></div></div><div className="prose"><h2>Sobre este imóvel</h2><p style={{ whiteSpace: "pre-wrap" }}>{p.description}</p><ul>{p.features.map((feature) => <li key={feature}>{feature}</li>)}</ul></div></article><aside><LeadForm propertyId={p.id} propertyTitle={p.title}/></aside></section>
  </>;
}
