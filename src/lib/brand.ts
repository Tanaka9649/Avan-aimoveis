export const brand = {
  name: "Avança Imóveis",
  tagline: "Imóveis escolhidos com critério. Negócios conduzidos com clareza.",
  phone: "",
  whatsapp: "",
  instagram: "",
  address: "",
  email: "",
} as const;

export function siteUrl(path = "") {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
