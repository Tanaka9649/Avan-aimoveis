import Link from "next/link";
import { Building2, LayoutDashboard, LogOut, PlusCircle } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { requireSuperAdmin } from "@/lib/access";

export const dynamic = "force-dynamic";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireSuperAdmin();
  return (
    <div className="admin-app theme-dark">
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <Link href="/superadmin" aria-label="Super Admin — início">
            <BrandLogo light />
          </Link>
        </div>
        <nav aria-label="Navegação do Super Admin">
          <small>PLATAFORMA</small>
          <Link href="/superadmin"><LayoutDashboard /><span>Visão global</span></Link>
          <Link href="/superadmin/empresas"><Building2 /><span>Empresas</span></Link>
          <Link href="/superadmin/empresas/nova"><PlusCircle /><span>Nova empresa</span></Link>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-profile">
            <span>{user.name.slice(0, 2).toUpperCase()}</span>
            <div><strong>{user.name}</strong><small>Super Admin</small></div>
          </div>
          <form action="/api/auth/logout" method="post">
            <button className="sidebar-logout"><LogOut /><span>Sair</span></button>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-header">
          <div className="header-context"><span>Plataforma</span><small>Super Admin</small></div>
          <div className="admin-search">Gestão global multi-tenant</div>
          <Link className="admin-view-site" href="/">Ver site</Link>
        </header>
        {children}
      </div>
    </div>
  );
}
