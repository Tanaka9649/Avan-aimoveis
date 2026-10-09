export type BrandLogoEntry = {
  id: string;
  name?: string;
  logoLight?: string;
  logoDark?: string;
};

export type TenantBranding = {
  logoLight?: string;
  logoDark?: string;
  favicon?: string;
  logos?: BrandLogoEntry[];
};

const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export function brandingLogos(branding?: TenantBranding | null): BrandLogoEntry[] {
  const configured = Array.isArray(branding?.logos)
    ? branding.logos
        .map((logo, index) => ({
          id: clean(logo?.id) || `logo-${index + 1}`,
          name: clean(logo?.name) || undefined,
          logoLight: clean(logo?.logoLight) || undefined,
          logoDark: clean(logo?.logoDark) || undefined,
        }))
        .filter((logo) => logo.logoLight || logo.logoDark)
    : [];

  if (configured.length) return configured.slice(0, 8);

  const logoLight = clean(branding?.logoLight);
  const logoDark = clean(branding?.logoDark);
  if (logoLight || logoDark) {
    return [{
      id: "primary",
      name: "Marca principal",
      logoLight: logoLight || undefined,
      logoDark: logoDark || undefined,
    }];
  }
  return [];
}

export function compactBrandLogos(logos: BrandLogoEntry[]) {
  return logos
    .slice(0, 8)
    .map((logo, index) => ({
      id: clean(logo.id) || `logo-${index + 1}`,
      name: clean(logo.name) || undefined,
      logoLight: clean(logo.logoLight) || undefined,
      logoDark: clean(logo.logoDark) || undefined,
    }))
    .filter((logo) => logo.logoLight || logo.logoDark);
}
