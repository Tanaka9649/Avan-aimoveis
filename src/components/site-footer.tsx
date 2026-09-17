import Link from "next/link";
import { brand } from "@/lib/brand";

export function SiteFooter() { return <footer><div className="shell footer-grid"><div><div className="brand brand-light">AVAN<span className="brand-dot">.</span></div><p>{brand.tagline}</p></div><div><strong>Navegue</strong><Link href="/imoveis">Imóveis</Link><Link href="/sobre">Sobre</Link><Link href="/favoritos">Favoritos</Link></div><div><strong>Fale conosco</strong><span>{brand.phone}</span><span>{brand.email}</span><span>{brand.address}</span></div></div><div className="shell footer-bottom"><span>© 2026 Avan Imóveis</span><span>Privacidade e LGPD · CRECI demonstrativo</span></div></footer> }
