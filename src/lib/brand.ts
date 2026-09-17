export const brand = {
  name: "Avan Imóveis",
  tagline: "Imóveis escolhidos com critério. Negócios conduzidos com clareza.",
  phone: "+55 11 4000-2026",
  whatsapp: "551140002026",
  instagram: "@avanimoveis",
  address: "São Paulo, SP",
  email: "contato@avanimoveis.com.br",
} as const;

export function siteUrl(path = "") {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").trim().replace(/\/$/, "");
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
