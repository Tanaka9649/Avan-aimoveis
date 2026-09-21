import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import { brand } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";

export function SiteFooter() {
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div><Link href="/" aria-label="Avança Imóveis — início"><BrandLogo light/></Link><p>Imóveis escolhidos com critério.<br/>Negócios conduzidos com clareza.</p></div>
      <div><strong>Navegue</strong><Link href="/imoveis">Imóveis</Link><Link href="/sobre">Sobre</Link><Link href="/favoritos">Favoritos</Link><Link href="/contato">Contato</Link></div>
      <div><strong>Atendimento</strong><Link href="/contato">Fale com a Avança <ArrowUpRight size={15}/></Link>{brand.phone ? <a href={`tel:+55${brand.phone.replace(/\D/g, "")}`}><Phone size={16}/>{brand.phone}</a> : null}<a href={`https://wa.me/${brand.whatsapp}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a>{brand.email ? <a href={`mailto:${brand.email}`}>{brand.email}</a> : null}{brand.address ? <span>{brand.address}</span> : null}</div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} Avança Imóveis</span><span>Seu próximo passo começa aqui.</span></div>
  </footer>;
}
