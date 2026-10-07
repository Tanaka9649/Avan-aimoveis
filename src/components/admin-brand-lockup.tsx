import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";

type AdminBrandLockupProps = {
  compact: boolean;
  href: string;
  light: boolean;
};

export function AdminBrandLockup({ compact, href, light }: AdminBrandLockupProps) {
  return (
    <Link
      className="admin-brand-link"
      href={href}
      aria-label={compact ? "Avança Imóveis — início do painel" : "Avança Imóveis e Rogério Côrtes — início do painel"}
    >
      {compact ? (
        <BrandLogo light={light} compact />
      ) : (
        <span className="admin-brand-lockup">
          <BrandLogo light={light} />
          <span className="admin-brand-divider" aria-hidden="true" />
          <span className="rogerio-brand-frame">
            <Image
              className="rogerio-brand-logo"
              src="/rogerio-cortes-logo.png"
              alt="Rogério Côrtes - Corretor de Imóveis"
              width={799}
              height={522}
              sizes="72px"
              priority
            />
          </span>
        </span>
      )}
    </Link>
  );
}
