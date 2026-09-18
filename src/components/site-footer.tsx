import Link from "next/link";
import { brand } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";
export function SiteFooter() {
  return <footer className="site-footer"><div className="shell footer-grid"><div><BrandLogo light/><p>{brand.tagline}</p></div><div><strong>Navegue</strong><Link href="/imoveis">Imóveis</Link><Link href="/sobre">Sobre</Link><Link href="/favoritos">Favoritos</Link></div><div><strong>Atendimento</strong><Link href="/contato">Fale com a Avança</Link>{brand.phone && <span>{brand.phone}</span>}{brand.address && <span>{brand.address}</span>}</div></div><div className="shell footer-bottom"><span>© 2026 Avança Imóveis</span></div></footer>;
}
