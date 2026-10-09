"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Heart, Menu, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import type { TenantBranding } from "@/lib/branding";

type Props = {
  tenant: {
    name: string;
    slug: string;
    branding: TenantBranding;
  };
  basePath?: string;
};

export function SiteHeader({ tenant, basePath = "" }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const route = (path: string) => `${basePath}${path}`;
  const links = [{ href: route("/imoveis"), label: "Imóveis" }, { href: route("/sobre"), label: "Sobre" }, { href: route("/contato"), label: "Contato" }];
  const close = () => setOpen(false);
  return <header className="site-header" onKeyDown={(event) => { if (event.key === "Escape") { close(); toggle.current?.focus(); } }}>
    <div className="shell header-inner">
      <Link className="brand" href={basePath || "/"} aria-label={`${tenant.name} — início`} onClick={close}><BrandLogo branding={tenant.branding} name={tenant.name}/></Link>
      <nav className="desktop-navigation" aria-label="Navegação principal">{links.map((link) => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}</nav>
      <div className="header-actions">
        <Link className="icon-link" href={route("/favoritos")} aria-label="Favoritos" onClick={close}><Heart size={19}/><span>Favoritos</span></Link>
        <Link className="button button-sm" href={route("/imoveis")}>Encontrar imóvel</Link>
        <button ref={toggle} className="menu-button" aria-label={open ? "Fechar menu" : "Abrir menu"} aria-expanded={open} aria-controls="public-mobile-navigation" onClick={() => setOpen(!open)}>{open ? <X/> : <Menu/>}</button>
      </div>
    </div>
    <nav id="public-mobile-navigation" className="mobile-navigation shell" aria-label="Navegação mobile" hidden={!open}>
      {links.map((link) => <Link key={link.href} href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined}>{link.label}</Link>)}
      <Link href={route("/favoritos")} onClick={close}>Favoritos</Link><Link className="button" href={route("/imoveis")} onClick={close}>Encontrar imóvel</Link>
    </nav>
  </header>;
}
