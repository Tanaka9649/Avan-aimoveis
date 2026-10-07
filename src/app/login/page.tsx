import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, ShieldCheck } from "lucide-react";
import { BrandLockup } from "@/components/brand-lockup";
import { LoginForm } from "@/components/login-form";
import { brand } from "@/lib/brand";
import "./login.css";

export const metadata: Metadata = {
  title: "Acesso ao painel",
  description: `Acesso seguro à plataforma da ${brand.name}.`,
};

export default function LoginPage() {
  return (
    <section className="login-page">
      <aside className="login-visual" aria-label={brand.name}>
        <Image
          src="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1800&q=88"
          alt={`Residência contemporânea representando o portfólio da ${brand.name}`}
          fill
          priority
          sizes="(max-width: 900px) 0px, 54vw"
          className="login-visual-image"
          unoptimized
        />
        <div className="login-visual-overlay" />

        <BrandLockup className="login-brand" href="/" onDark eager />

        <div className="login-visual-content">
          <span className="login-visual-kicker"><ShieldCheck aria-hidden="true" /> Plataforma da equipe</span>
          <h2>Organização para avançar com confiança.</h2>
          <p>Imóveis, clientes e negociações reunidos em uma experiência clara e segura.</p>
          <ul aria-label="Benefícios da plataforma">
            <li><Check aria-hidden="true" /> Gestão centralizada</li>
            <li><Check aria-hidden="true" /> Acesso protegido</li>
          </ul>
        </div>

        <p className="login-visual-note">{brand.name} · Plataforma interna</p>
      </aside>

      <div className="login-access">
        <header className="login-access-header">
          <BrandLockup className="login-mobile-brand" href="/" eager />
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
