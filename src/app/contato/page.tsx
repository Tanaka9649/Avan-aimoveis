import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { tenantForRequest, tenantPublicPathBase } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export default async function ContactPage() {
  const tenant = await tenantForRequest();
  if (!tenant) notFound();
  const basePath = tenantPublicPathBase(tenant);
  const phone = tenant.phone || tenant.whatsapp;
  return (
    <section className="section page-top shell public-contact">
      <div className="editorial">
        <span className="eyebrow">Vamos conversar</span>
        <h1>Conte o que você procura.</h1>
        <p className="lede">Cada busca começa com uma boa conversa. Fale com {tenant.name} sobre suas prioridades ou solicite atendimento na página do imóvel de seu interesse.</p>
        <Link href={`${basePath}/imoveis`} className="button button-secondary">Explorar imóveis</Link>
      </div>
      <aside className="public-contact-card">
        <MessageCircle aria-hidden="true"/>
        <h2>Atendimento próximo,<br/>desde o primeiro contato.</h2>
        <p>Nossa equipe ajuda com os detalhes e com o agendamento de uma visita.</p>
        {phone ? <a href={`tel:+55${phone.replace(/\D/g, "")}`}><Phone size={18}/>{phone}</a> : null}
        {tenant.whatsapp ? <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, "")}`} className="button" target="_blank" rel="noreferrer"><MessageCircle size={18}/>Conversar pelo WhatsApp</a> : null}
      </aside>
    </section>
  );
}
