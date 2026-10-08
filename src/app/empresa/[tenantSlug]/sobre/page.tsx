import { Award, Handshake, MapPinned } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

export default async function TenantAboutPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}/sobre`);
  if (!tenantOperational(resolution.tenant.status)) notFound();
  return <section className="section page-top shell"><div className="editorial"><span className="eyebrow">Sobre {resolution.tenant.name}</span><h1>Uma imobiliária para decisões importantes.</h1><p className="lede">Unimos leitura de mercado, atenção aos detalhes e uma relação transparente para tornar compra e venda de imóveis mais seguras.</p><div className="value-grid"><div><Award/><h2>Curadoria</h2><p>Selecionamos imóveis com qualidade, documentação e preço coerentes.</p></div><div><Handshake/><h2>Proximidade</h2><p>Atendimento humano, sem pressão e com uma pessoa acompanhando toda a jornada.</p></div><div><MapPinned/><h2>Conhecimento local</h2><p>Contexto real sobre bairros, mobilidade e potencial de cada região.</p></div></div></div></section>;
}
