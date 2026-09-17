import Link from "next/link";
import { brand } from "@/lib/brand";
export default function ContactPage() {
  return <section className="section page-top shell"><div className="editorial"><span className="eyebrow">Avança Imóveis</span><h1>Conte o que você procura.</h1><p className="lede">Você pode solicitar atendimento diretamente na página do imóvel de seu interesse.</p><Link href="/imoveis" className="button button-dark">Explorar imóveis</Link>{brand.whatsapp && <a href={`https://wa.me/${brand.whatsapp}`} className="button">Conversar pelo WhatsApp</a>}</div></section>;
}
