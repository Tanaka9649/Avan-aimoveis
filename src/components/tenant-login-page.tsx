import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import { tenantOperational, type TenantRecord } from "@/lib/tenant";

export function TenantLoginPage({ tenant }: { tenant: TenantRecord | null }) {
  if (!tenant || !tenantOperational(tenant.status)) notFound();

  const homeHref = tenant.slug === "avanca-imoveis" ? "/" : `/empresa/${tenant.slug}`;

  return (
    <section className="login-page">
      <aside className="login-visual" aria-label={tenant.name}>
        <Image
          src="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1800&q=88"
          alt={`Residência contemporânea representando ${tenant.name}`}
          fill
          priority
          sizes="(max-width: 900px) 0px, 54vw"
          className="login-visual-image"
          unoptimized
        />
        <div className="login-visual-overlay" />

        <Link className="login-brand" href={homeHref} aria-label={`Ir para o site de ${tenant.name}`}>
          <BrandLogo light name={tenant.name} branding={tenant.branding} />
        </Link>

        <div className="login-visual-content">
          <span className="login-visual-kicker">
            <ShieldCheck aria-hidden="true" />
            Plataforma da equipe
          </span>
          <h2>Organização para avançar com confiança.</h2>
          <p>Imóveis, clientes e negociações reunidos em uma experiência clara, moderna e segura.</p>
          <ul aria-label="Benefícios da plataforma">
            <li><Check aria-hidden="true" /> Gestão centralizada</li>
            <li><Check aria-hidden="true" /> Acesso protegido</li>
          </ul>
        </div>

        <p className="login-visual-note">{tenant.name} · Plataforma interna</p>
      </aside>

      <div className="login-access">
        <header className="login-access-header">
          <Link className="login-mobile-brand" href={homeHref} aria-label={`Ir para o site de ${tenant.name}`}>
            <BrandLogo name={tenant.name} branding={tenant.branding} />
          </Link>
          <Link className="login-back-link" href={homeHref}>
            <ArrowLeft aria-hidden="true" />
            Voltar ao site
          </Link>
        </header>

        <div className="login-form-shell">
          <LoginForm tenantSlug={tenant.slug} tenantName={tenant.name} />
        </div>

        <div className="login-access-footer">
          <ShieldCheck aria-hidden="true" />
          Ambiente seguro e de uso exclusivo da equipe.
        </div>
      </div>
    </section>
  );
}
