import Image from "next/image";
export function BrandLogo({ light = false }: { light?: boolean }) {
  return <Image src="/avanca-logo.png" alt="Avança Imóveis" width={1536} height={1024} className={light ? "avanca-logo avanca-logo-light" : "avanca-logo"} priority/>;
}
