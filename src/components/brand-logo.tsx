import Image from "next/image";
import { Fragment } from "react";
import { brandingLogos, type TenantBranding } from "@/lib/branding";

export function BrandLogo({
  light = false,
  compact = false,
  branding,
  name = "Avança Imóveis e Rogério Cortes",
}: {
  light?: boolean;
  compact?: boolean;
  branding?: TenantBranding;
  name?: string;
}) {
  const configured = brandingLogos(branding);
  const legacy = !branding?.logos?.length;

  if (compact) {
    const first = configured[0];
    const src = (light ? first?.logoDark || first?.logoLight : first?.logoLight || first?.logoDark) || "/icon.png";
    return <Image src={src} alt={first?.name || name} width={128} height={128} className="brand-icon" priority unoptimized={src.startsWith("http")}/>;
  }

  const logos = configured.length
    ? configured
    : [{ id: "default", name, logoLight: "/avanca-logo.png", logoDark: "/avanca-logo.png" }];

  return (
    <span className={`brand-logo-group${light ? " brand-logo-light" : ""}${legacy ? " legacy-branding" : ""}`} aria-label={name}>
      {logos.map((logo, index) => {
        const src = light ? logo.logoDark || logo.logoLight : logo.logoLight || logo.logoDark;
        if (!src) return null;
        return (
          <Fragment key={logo.id || `logo-${index}`}>
            {index > 0 ? <span className="brand-logo-separator" aria-hidden="true"/> : null}
            <span className="brand-logo-item">
              <Image
                src={src}
                alt={logo.name || `${name} — marca ${index + 1}`}
                width={360}
                height={180}
                className="brand-logo-image"
                priority
                unoptimized={src.startsWith("http")}
              />
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}
