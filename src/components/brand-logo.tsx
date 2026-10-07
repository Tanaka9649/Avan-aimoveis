import Image from "next/image";

type BrandLogoProps = {
  alt: string;
  compact?: boolean;
  eager?: boolean;
  onDark?: boolean;
};

export function BrandLogo({ alt, compact = false, eager = false, onDark = false }: BrandLogoProps) {
  return (
    <Image
      src={compact ? "/icon.png" : "/avanca-logo.png"}
      alt={alt}
      width={compact ? 1024 : 1536}
      height={1024}
      className={`${compact ? "brand-icon" : "avanca-logo"}${onDark ? " avanca-logo-light" : ""}`}
      loading={eager ? "eager" : "lazy"}
    />
  );
}
