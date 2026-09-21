import Link from "next/link";
import { brand } from "@/lib/brand";
import { MessageCircle, Phone } from "lucide-react";
export default function ContactPage() {
  return <section className="section page-top shell public-contact"><div className="editorial"><span className="eyebrow">Vamos conversar</span><h1>Conte o que você procura.</h1><p className="lede">Cada busca começa com uma boa conversa. Fale com a Avança sobre suas prioridades ou solicite atendimento na página do imóvel de seu interesse.</p><Link href="/imoveis" className="button button-secondary">Explorar imóveis</Link></div><aside className="public-contact-card"><MessageCircle aria-hidden="true"/><h2>Atendimento próximo,<br/>desde o primeiro contato.</h2><p>Nossa equipe ajuda com os detalhes e com o agendamento de uma visita.</p>{brand.phone ? <a href={`tel:+55${brand.phone.replace(/\D/g,"")}`}><Phone size={18}/>{brand.phone}</a> : null}<a href={`https://wa.me/${brand.whatsapp}`} className="button" target="_blank" rel="noreferrer"><MessageCircle size={18}/>Conversar pelo WhatsApp</a></aside></section>;
}
