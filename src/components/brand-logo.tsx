import Image from "next/image";
type Branding = { logoLight?: string; logoDark?: string; favicon?: string };
export function BrandLogo({ light = false, compact = false, branding, name = "Avança Imóveis e Rogério Cortes" }: { light?: boolean; compact?: boolean; branding?: Branding; name?: string }) {
  const configured = light ? branding?.logoDark : branding?.logoLight;
  const src = configured || (compact ? "/icon.png" : "/avanca-logo.png");
  return <Image src={src} alt={name} width={compact ? 128 : 360} height={compact ? 128 : 180} className={`${compact ? "brand-icon" : "avanca-logo"}${light ? " avanca-logo-light" : ""}`} priority unoptimized={src.startsWith("http")}/>;
}
