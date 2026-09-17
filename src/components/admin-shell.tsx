"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { BarChart3, Building2, CalendarDays, ChevronLeft, Contact, HandCoins, KanbanSquare, LogOut, Menu, Settings, Users, X } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { canAccess, modules, type Access, type Module } from "@/lib/permissions";

const moduleMeta: Record<Module, { label: string; icon: typeof Building2 }> = {
  imoveis: { label: "Imóveis", icon: Building2 },
  clientes: { label: "Clientes", icon: Users },
  crm: { label: "CRM", icon: KanbanSquare },
  visitas: { label: "Visitas", icon: CalendarDays },
  propostas: { label: "Propostas e vendas", icon: HandCoins },
  proprietarios: { label: "Proprietários", icon: Contact },
};

export function AdminShell({ children, user }: { children: React.ReactNode; user: { name: string; role: string; access: Access } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href: string) => href === "/painel" ? pathname === href : pathname.startsWith(href);
  const item = (href: string, label: string, Icon: typeof Building2) => <Link aria-current={active(href) ? "page" : undefined} className={active(href) ? "active" : ""} href={href} onClick={() => setOpen(false)}><Icon/><span>{label}</span></Link>;
  return <div className="admin-app">
    <button className={"sidebar-backdrop" + (open ? " open" : "")} aria-label="Fechar menu" onClick={() => setOpen(false)}/>
    <aside className={"admin-sidebar" + (open ? " open" : "")}>
      <div className="sidebar-brand"><Link href="/painel" aria-label="Avança Imóveis — início do painel"><BrandLogo light/></Link><button aria-label="Fechar menu" onClick={() => setOpen(false)}><X/></button></div>
      <nav aria-label="Navegação do painel">
        <small>OPERAÇÃO</small>
        {item("/painel", "Visão geral", BarChart3)}
        {modules.filter((module) => canAccess(user, module)).map((module) => { const meta = moduleMeta[module]; return <div key={module}>{item(`/painel/${module}`, meta.label, meta.icon)}</div>; })}
        {user.role === "admin" && <><small>ADMINISTRAÇÃO</small>{item("/painel/configuracoes", "Equipe e acessos", Settings)}</>}
      </nav>
      <div className="sidebar-profile"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrador" : "Equipe"}</small></div></div>
      <form action="/api/auth/logout" method="post"><button className="sidebar-logout"><LogOut/> Sair</button></form>
    </aside>
    <div className="admin-main"><header className="admin-header"><button className="admin-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu/></button><div><span>Painel operacional</span><small>Avança Imóveis</small></div><Link className="admin-view-site" href="/" target="_blank">Ver site <ChevronLeft/></Link></header>{children}</div>
  </div>;
}
