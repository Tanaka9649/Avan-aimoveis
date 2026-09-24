"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Contact,
  HandCoins,
  KanbanSquare,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Users,
  X,
} from "lucide-react";
import { canAccess, firstAllowedRoute, modules, type Access, type Module } from "@/lib/permissions";
import { BrandLogo } from "./brand-logo";

const moduleMeta: Record<Module, { label: string; icon: typeof Building2 }> = {
  dashboard: { label: "Visão geral", icon: BarChart3 },
  imoveis: { label: "Imóveis", icon: Building2 },
  clientes: { label: "Clientes", icon: Users },
  crm: { label: "CRM", icon: KanbanSquare },
  visitas: { label: "Visitas", icon: CalendarDays },
  propostas: { label: "Propostas e vendas", icon: HandCoins },
  proprietarios: { label: "Proprietários", icon: Contact },
};

const routeLabels: Record<string, string> = {
  "/painel": "Visão geral",
  "/painel/imoveis": "Imóveis",
  "/painel/clientes": "Clientes",
  "/painel/crm": "CRM comercial",
  "/painel/visitas": "Visitas",
  "/painel/propostas": "Propostas e vendas",
  "/painel/proprietarios": "Proprietários",
  "/painel/configuracoes": "Equipe e acessos",
  "/painel/busca": "Busca global",
};

export function AdminShell({ children, user }: { children: React.ReactNode; user: { name: string; role: string; access: Access } }) {
  const pathname = usePathname();
  const homeHref = firstAllowedRoute(user);
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setCollapsed(localStorage.getItem("avanca:sidebar") === "collapsed");
      setTheme(localStorage.getItem("avanca:theme") === "light" ? "light" : "dark");
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(()=>{const shortcut=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="k"){event.preventDefault();searchRef.current?.focus();}};window.addEventListener("keydown",shortcut);return()=>window.removeEventListener("keydown",shortcut)},[]);

  const active = (href: string) => href === "/painel" ? pathname === href : pathname.startsWith(href);
  const toggleCollapsed = () => setCollapsed((current) => {
    const next = !current;
    localStorage.setItem("avanca:sidebar", next ? "collapsed" : "expanded");
    return next;
  });
  const toggleTheme = () => setTheme((current) => {
    const next = current === "dark" ? "light" : "dark";
    localStorage.setItem("avanca:theme", next);
    return next;
  });
  const item = (href: string, label: string, Icon: typeof Building2) => (
    <Link
      aria-current={active(href) ? "page" : undefined}
      className={active(href) ? "active" : ""}
      href={href}
      onClick={() => setOpen(false)}
      title={collapsed ? label : undefined}
    >
      <Icon /><span>{label}</span>
    </Link>
  );
  const pageLabel = Object.entries(routeLabels).sort(([a], [b]) => b.length - a.length).find(([route]) => route === "/painel" ? pathname === route : pathname.startsWith(route))?.[1] ?? "Painel";

  return (
    <div className={`admin-app theme-${theme}${collapsed ? " sidebar-collapsed" : ""}`}>
      <button className={`sidebar-backdrop${open ? " open" : ""}`} aria-label="Fechar menu" onClick={() => setOpen(false)} />
      <aside className={`admin-sidebar${open ? " open" : ""}`}>
        <div className="sidebar-brand">
          <Link href={homeHref} aria-label="Avança Imóveis — início do painel"><BrandLogo light={theme === "dark"} compact={collapsed && !open} /></Link>
          <button className="sidebar-close" aria-label="Fechar menu" onClick={() => setOpen(false)}><X /></button>
          <button className="sidebar-collapse" aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"} title={collapsed ? "Expandir" : "Recolher"} onClick={toggleCollapsed}>{collapsed ? <ChevronRight /> : <ChevronLeft />}</button>
        </div>
        <nav aria-label="Navegação do painel">
          <small>OPERAÇÃO</small>
          {canAccess(user, "dashboard") ? item("/painel", "Visão geral", BarChart3) : null}
          {modules.filter((module) => module !== "dashboard" && module !== "clientes" && canAccess(user, module)).map((module) => {
            const meta = moduleMeta[module];
            return <div key={module}>{item(`/painel/${module}`, meta.label, meta.icon)}</div>;
          })}
          {user.role === "admin" ? <><small>ADMINISTRAÇÃO</small>{item("/painel/configuracoes", "Equipe e acessos", Settings)}</> : null}
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile"><span>{user.name.slice(0, 2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrador" : "Equipe"}</small></div></div>
          <button className="sidebar-utility" onClick={toggleTheme} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>{theme === "dark" ? <Sun /> : <Moon />}<span>{theme === "dark" ? "Tema claro" : "Tema escuro"}</span></button>
          <form action="/api/auth/logout" method="post"><button className="sidebar-logout"><LogOut /><span>Sair</span></button></form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <button className="admin-menu" aria-label="Abrir menu" onClick={() => setOpen(true)}><Menu /></button>
          <div className="header-context"><span>Painel</span><small>{pageLabel}</small></div>
          <form className="admin-global-search" action="/painel/busca" role="search"><Search /><input ref={searchRef} name="q" type="search" placeholder="Buscar clientes, imóveis e oportunidades" aria-label="Busca global"/><kbd>⌘ K</kbd></form>
          <button className="header-theme" aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"} onClick={toggleTheme}>{theme === "dark" ? <Sun /> : <Moon />}</button>
          <Link className="admin-view-site" href="/" target="_blank">Ver site <ChevronRight /></Link>
        </header>
        {children}
      </div>
    </div>
  );
}
