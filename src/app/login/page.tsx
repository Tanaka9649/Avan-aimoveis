import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { LoginForm } from "@/components/login-form";
import "./login.css";

export const metadata: Metadata = {
  title: "Acesso ao painel",
  description: "Acesso seguro à plataforma da Avança Imóveis.",
};

export default function LoginPage() {
  return (
    <section className="login-page">
      <aside className="login-visual" aria-label="Avança Imóveis">
        <Image
          src="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1800&q=88"
          alt="Residência contemporânea representando o portfólio da Avança Imóveis"
          fill
          priority
          sizes="(max-width: 900px) 0px, 54vw"
          className="login-visual-image"
          unoptimized
        />
        <div className="login-visual-overlay" />

        <Link className="login-brand" href="/" aria-label="Avança Imóveis — página inicial">
          <BrandLogo light />
        </Link>

        <div className="login-visual-content">
          <span className="login-visual-kicker"><ShieldCheck aria-hidden="true" /> Plataforma da equipe</span>
          <h2>Organização para avançar com confiança.</h2>
          <p>Imóveis, clientes e negociações reunidos em uma experiência clara e segura.</p>
          <ul aria-label="Benefícios da plataforma">
            <li><Check aria-hidden="true" /> Gestão centralizada</li>
            <li><Check aria-hidden="true" /> Acesso protegido</li>
          </ul>
        </div>

        <p className="login-visual-note">Avança Imóveis · Plataforma interna</p>
      </aside>

      <div className="login-access">
        <header className="login-access-header">
          <Link className="login-mobile-brand" href="/" aria-label="Avança Imóveis — página inicial">
            <BrandLogo />
          </Link>
          <Link className="login-back-link" href="/">
            <ArrowLeft aria-hidden="true" /> Voltar ao site
          </Link>
        </header>

        <div className="login-form-shell">
          <LoginForm />
        </div>

        <div className="login-access-footer">
          <ShieldCheck aria-hidden="true" /> Ambiente seguro e de uso exclusivo da equipe.
        </div>
      </div>
    </section>
  );
}
