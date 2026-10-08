import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

export default async function TenantContactPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const resolution = await tenantBySlug(tenantSlug);
  if (!resolution) notFound();
  if (resolution.redirectSlug) redirect(`/empresa/${resolution.redirectSlug}/contato`);
  const tenant = resolution.tenant;
  if (!tenantOperational(tenant.status)) notFound();
  const basePath = `/empresa/${tenant.slug}`;
  return <section className="section page-top shell public-contact"><div className="editorial"><span className="eyebrow">Vamos conversar</span><h1>Conte o que você procura.</h1><p className="lede">Cada busca começa com uma boa conversa. Fale com {tenant.name} sobre suas prioridades ou solicite atendimento na página do imóvel de seu interesse.</p><Link href={`${basePath}/imoveis`} className="button button-secondary">Explorar imóveis</Link></div><aside className="public-contact-card"><MessageCircle aria-hidden="true"/><h2>Atendimento próximo,<br/>desde o primeiro contato.</h2><p>Nossa equipe ajuda com os detalhes e com o agendamento de uma visita.</p>{tenant.phone ? <a href={`tel:+55${tenant.phone.replace(/\D/g, "")}`}><Phone size={18}/>{tenant.phone}</a> : null}{tenant.whatsapp ? <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, "")}`} className="button" target="_blank" rel="noreferrer"><MessageCircle size={18}/>Conversar pelo WhatsApp</a> : null}</aside></section>;
}
