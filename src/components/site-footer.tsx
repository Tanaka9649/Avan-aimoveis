import Link from "next/link";
import { ArrowUpRight, MessageCircle, Phone } from "lucide-react";
import { BrandLogo } from "./brand-logo";
import type { TenantBranding } from "@/lib/branding";

type Props = {
  tenant: {
    name: string;
    phone: string | null;
    whatsapp: string | null;
    email: string | null;
    branding: TenantBranding;
    settings: Record<string, unknown>;
  };
  basePath?: string;
};

export function SiteFooter({ tenant, basePath = "" }: Props) {
  const route = (path: string) => `${basePath}${path}`;
  const address = typeof tenant.settings.address === "string" ? tenant.settings.address : "";
  return <footer className="site-footer">
    <div className="shell footer-grid">
      <div><Link href={basePath || "/"} aria-label={`${tenant.name} — início`}><BrandLogo light branding={tenant.branding} name={tenant.name}/></Link><p>Imóveis escolhidos com critério.<br/>Negócios conduzidos com clareza.</p></div>
      <div><strong>Navegue</strong><Link href={route("/imoveis")}>Imóveis</Link><Link href={route("/sobre")}>Sobre</Link><Link href={route("/favoritos")}>Favoritos</Link><Link href={route("/contato")}>Contato</Link></div>
      <div><strong>Atendimento</strong><Link href={route("/contato")}>Fale com a equipe <ArrowUpRight size={15}/></Link>{tenant.phone ? <a href={`tel:+55${tenant.phone.replace(/\D/g, "")}`}><Phone size={16}/>{tenant.phone}</a> : null}{tenant.whatsapp ? <a href={`https://wa.me/${tenant.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={16}/>WhatsApp</a> : null}{tenant.email ? <a href={`mailto:${tenant.email}`}>{tenant.email}</a> : null}{address ? <span>{address}</span> : null}</div>
    </div>
    <div className="shell footer-bottom"><span>© {new Date().getFullYear()} {tenant.name}</span><span>Seu próximo passo começa aqui.</span></div>
  </footer>;
}
