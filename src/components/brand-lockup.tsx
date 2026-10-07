import Image from "next/image";
import Link from "next/link";
import { brand } from "@/lib/brand";
import { BrandLogo } from "./brand-logo";

type BrandLockupProps = {
  className?: string;
  compact?: boolean;
  eager?: boolean;
  href: string;
  onDark?: boolean;
};

const brokerLogo = {
  dark: { src: "/rogerio-cortes-logo-dark.png", width: 801, height: 523 },
  light: { src: "/rogerio-cortes-logo-light.png", width: 1150, height: 1031 },
} as const;

export function BrandLockup({ className, compact = false, eager = false, href, onDark = false }: BrandLockupProps) {
  const logo = onDark ? brokerLogo.dark : brokerLogo.light;

  return (
    <Link
      className={["brand-lockup-link", onDark ? "brand-lockup-on-dark" : "brand-lockup-on-light", className].filter(Boolean).join(" ")}
      href={href}
      aria-label={`${brand.name} — início`}
    >
      {compact ? (
        <BrandLogo alt="" compact eager={eager} onDark={onDark} />
      ) : (
        <span className="brand-lockup">
          <BrandLogo alt="" eager={eager} onDark={onDark} />
          <span className="brand-lockup-divider" aria-hidden="true" />
          <span className="broker-brand-mark">
            <Image
              className="broker-brand-logo"
              src={logo.src}
              alt=""
              width={logo.width}
              height={logo.height}
              sizes="(max-width: 640px) 76px, 100px"
              loading={eager ? "eager" : "lazy"}
            />
          </span>
        </span>
      )}
    </Link>
  );
}
