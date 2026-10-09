import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";

export default function SuperAdminNotFound() {
  return (
    <main className="admin-content">
      <section className="admin-card admin-route-error">
        <SearchX aria-hidden="true"/>
        <span className="page-eyebrow">404</span>
        <h1>Área administrativa não encontrada</h1>
        <p>Este endereço não existe no Super Admin ou ainda não está disponível.</p>
        <div>
          <Link className="admin-button primary" href="/superadmin">Voltar à visão global</Link>
          <Link className="admin-button secondary" href="/superadmin/empresas"><ArrowLeft/> Ver empresas</Link>
        </div>
      </section>
    </main>
  );
}
