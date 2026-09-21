"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const links = [{ href: "/imoveis", label: "Imóveis" }, { href: "/sobre", label: "Sobre" }, { href: "/contato", label: "Contato" }];
  const close = () => setOpen(false);
  return <header className="site-header" onKeyDown={event => { if (event.key === "Escape") { close(); toggle.current?.focus(); } }}>
    <div className="shell header-inner">
      <Link className="brand" href="/" aria-label="Avança Imóveis — início" onClick={close}><BrandLogo/></Link>
      <nav className="desktop-navigation" aria-label="Navegação principal">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}</nav>
      <div className="header-actions">
        <Link className="icon-link" href="/favoritos" aria-label="Favoritos" onClick={close}><Heart size={19}/><span>Favoritos</span></Link>
        <Link className="button button-sm" href="/imoveis">Encontrar imóvel</Link>
        <button ref={toggle} className="menu-button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="public-mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
    </div>
    <nav id="public-mobile-navigation" className="mobile-navigation shell" aria-label="Navegação mobile" hidden={!open}>
      {links.map(link => <Link key={link.href} href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
      <Link href="/favoritos" onClick={close}>Favoritos</Link><Link className="button" href="/imoveis" onClick={close}>Encontrar imóvel</Link>
    </nav>
  </header>;
}
