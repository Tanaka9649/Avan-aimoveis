import Link from "next/link";
import { SearchX } from "lucide-react";

export default function TenantPanelNotFound() {
  return (
    <div className="admin-content">
      <section className="admin-card admin-route-error">
        <SearchX aria-hidden="true"/>
        <span className="page-eyebrow">404</span>
        <h1>Esta área não foi encontrada</h1>
        <p>O endereço interno pode ter mudado ou você pode não ter acesso a este recurso.</p>
        <div><Link className="admin-button primary" href="/painel">Voltar ao painel</Link></div>
      </section>
    </div>
  );
}
