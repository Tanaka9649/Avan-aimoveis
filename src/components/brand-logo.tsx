import Image from "next/image";
export function BrandLogo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return <Image src={compact ? "/icon.png" : "/avanca-logo.png"} alt="Avança Imóveis" width={compact ? 1024 : 1536} height={1024} className={`${compact ? "brand-icon" : "avanca-logo"}${light ? " avanca-logo-light" : ""}`} priority/>;
}
