"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, LayoutDashboard, LogOut, Menu, PlusCircle, X } from "lucide-react";
import { useState } from "react";

export function SuperAdminShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string };
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => href === "/superadmin" ? pathname === href : pathname.startsWith(href);

  return (
    <div className="admin-app theme-dark superadmin-app">
      <button className={`sidebar-backdrop${open ? " open" : ""}`} aria-label="Fechar menu" onClick={() => setOpen(false)}/>
      <aside className={`admin-sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand platform-sidebar-brand">
          <Link href="/superadmin" aria-label="Super Admin — início">
            <span className="platform-mark">IP</span>
            <span className="platform-wordmark"><strong>Plataforma</strong><small>Super Admin</small></span>
          </Link>
          <button className="sidebar-close" aria-label="Fechar menu" onClick={() => setOpen(false)}><X/></button>
        </div>
        <nav aria-label="Navegação do Super Admin">
          <small>PLATAFORMA</small>
          <Link className={active("/superadmin") ? "active" : ""} href="/superadmin" onClick={() => setOpen(false)}><LayoutDashboard/><span>Visão global</span></Link>
          <Link className={active("/superadmin/empresas") && !pathname.endsWith("/nova") ? "active" : ""} href="/superadmin/empresas" onClick={() => setOpen(false)}><Building2/><span>Empresas</span></Link>
          <Link className={pathname.endsWith("/nova") ? "active" : ""} href="/superadmin/empresas/nova" onClick={() => setOpen(false)}><PlusCircle/><span>Nova empresa</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>Super Admin</small></div></div>
          <form action="/api/auth/logout" method="post"><button className="sidebar-logout"><LogOut/><span>Sair</span></button></form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button className="admin-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu/></button>
          <div className="header-context"><span>Plataforma</span><small>Super Admin</small></div>
          <div className="admin-search">Gestão global multi-tenant</div>
        </header>
        {children}
      </div>
    </div>
  );
}
