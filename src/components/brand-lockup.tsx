import Image from "next/image";
import Link from "next/link";
import { BrandLogo } from "./brand-logo";

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
  href: string;
  light?: boolean;
};

export function BrandLockup({ className, compact = false, href, light = false }: BrandLockupProps) {
  return (
    <Link
      className={["brand-lockup-link", className].filter(Boolean).join(" ")}
      href={href}
      aria-label={compact ? "Avança Imóveis — início" : "Avança Imóveis e Rogério Côrtes — início"}
    >
      {compact ? (
        <BrandLogo light={light} compact />
      ) : (
        <span className="brand-lockup">
          <BrandLogo light={light} />
          <span className="brand-lockup-divider" aria-hidden="true" />
          <span className="broker-brand-frame">
            <Image
              className="broker-brand-logo"
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
