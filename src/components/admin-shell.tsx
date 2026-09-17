import Link from "next/link";
import { LogOut } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import { canAccess, modules, type Access } from "@/lib/permissions";
const labels = { imoveis: "Imóveis", clientes: "Clientes", crm: "CRM", visitas: "Visitas", propostas: "Propostas e vendas", proprietarios: "Proprietários" };
export function AdminShell({ children, user }: { children: React.ReactNode; user: { name: string; role: string; access: Access } }) {
  return <div className="admin-app"><aside className="admin-sidebar"><Link className="admin-brand" href="/painel"><BrandLogo light/></Link><nav><Link href="/painel">Visão geral</Link>{modules.filter((module) => canAccess(user, module)).map((module) => <Link key={module} href={`/painel/${module}`}>{labels[module]}</Link>)}{user.role === "admin" && <Link href="/painel/configuracoes">Administração e acessos</Link>}</nav><form action="/api/auth/logout" method="post"><button><LogOut/> Sair</button></form></aside><div className="admin-main"><header className="admin-header"><div className="admin-user"><span>{user.name.slice(0,2).toUpperCase()}</span><div><strong>{user.name}</strong><small>{user.role === "admin" ? "Administrador" : "Equipe"}</small></div></div></header>{children}</div></div>;
}
