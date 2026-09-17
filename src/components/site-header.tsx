import Link from "next/link";
import { BrandLogo } from "./brand-logo";
import { Heart, Menu } from "lucide-react";

export function SiteHeader() {
  return <header className="site-header"><div className="shell header-inner">
    <Link className="brand" href="/"><BrandLogo/></Link>
    <nav aria-label="Navegação principal"><Link href="/imoveis">Imóveis</Link><Link href="/sobre">Sobre</Link><Link href="/contato">Contato</Link></nav>
    <div className="header-actions"><Link className="icon-link" href="/favoritos" aria-label="Favoritos"><Heart size={19}/><span>Favoritos</span></Link><Link className="button button-sm" href="/imoveis">Encontrar imóvel</Link><button className="menu-button" aria-label="Abrir menu"><Menu/></button></div>
  </div></header>;
}
