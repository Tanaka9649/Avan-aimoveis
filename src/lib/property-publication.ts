import { siteUrl } from "./brand";
import { formatMoney } from "./format";

/** Commercial status that a property must hold to appear in the public catalogue. */
export const PUBLIC_STATUS = "disponivel";

export type PublicationState = { status: string; publishedAt: Date | string | null };

/** The publish switch itself: set when the team pressed "publicar", cleared when they unpublished. */
export const isPublished = (property: PublicationState) => !!property.publishedAt;

/**
 * Whether the site should show this property. Publication and commercial status are separate
 * concerns: a published property that is paused, reserved or sold leaves the catalogue without
 * losing the fact that it was published, and its public URL stops resolving.
 */
export const isPubliclyVisible = (property: PublicationState) => isPublished(property) && property.status === PUBLIC_STATUS;

const STATUS_REASON: Record<string, string> = {
  rascunho: "Rascunho — não aparece no site",
  reservado: "Reservado — fora do catálogo",
  vendido: "Vendido — fora do catálogo",
  pausado: "Pausado — fora do catálogo",
};

/** One line the panel can show to answer "esse imóvel está visível no site?". */
export function siteVisibility(property: PublicationState) {
  if (isPubliclyVisible(property)) return { published: true, label: "No site", detail: "Visível no catálogo público" };
  if (isPublished(property)) return { published: false, label: "Fora do site", detail: STATUS_REASON[property.status] || "Fora do catálogo" };
  return { published: false, label: "Não publicado", detail: "Publique para gerar o link público" };
}

export type PublicationCandidate = {
  status?: string;
  title?: string | null;
  priceCents?: number | null;
  description?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  area?: number | string | null;
  photoCount?: number;
};

/**
 * What the site needs before a listing can go live. Deliberately public-facing only:
 * owner data, documents and commissions are never required to publish.
 */
export function publicationChecks(property: PublicationCandidate) {
  return [
    { label: "Título do anúncio", done: (property.title?.trim().length || 0) >= 8 },
    { label: "Preço de venda", done: Number(property.priceCents) > 0 },
    { label: "Região pública (bairro, cidade e UF)", done: !!property.neighborhood?.trim() && !!property.city?.trim() && !!property.state?.trim() },
    { label: "Descrição com pelo menos 30 caracteres", done: (property.description?.trim().length || 0) >= 30 },
    { label: "Área privativa", done: Number(property.area) > 0 },
    { label: "Pelo menos 1 foto", done: Number(property.photoCount) > 0 },
  ];
}

export const publicationBlockers = (property: PublicationCandidate) => publicationChecks(property).filter((check) => !check.done).map((check) => check.label);

export function canPublish(property: PublicationCandidate) {
  if (property.status === "vendido") return false;
  return publicationBlockers(property).length === 0;
}

/** The one place that knows what a public property URL looks like. */
export const publicPropertyPath = (slug: string) => `/imoveis/${slug}`;
export const publicPropertyUrl = (slug: string) => siteUrl(publicPropertyPath(slug));

export type ShareablePropety = {
  title: string;
  slug: string;
  priceCents: number;
  neighborhood: string;
  city: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  parkingSpaces?: number | null;
};

/** Ready-to-paste message used by "Copiar mensagem" and by the WhatsApp hand-off. */
export function sharePropertyMessage(property: ShareablePropety) {
  const specs = [
    Number(property.bedrooms) > 0 ? `${property.bedrooms} quartos` : "",
    Number(property.bathrooms) > 0 ? `${property.bathrooms} banheiros` : "",
    Number(property.parkingSpaces) > 0 ? `${property.parkingSpaces} vagas` : "",
  ].filter(Boolean).join(" • ");
  return [
    "Olá! Separei este imóvel para você:",
    "",
    property.title,
    formatMoney(property.priceCents),
    `${property.neighborhood} • ${property.city}`,
    specs,
    "",
    "Veja todos os detalhes e fotos:",
    publicPropertyUrl(property.slug),
  ].filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

/** Opens WhatsApp with the message ready — never sends anything on its own. */
export function whatsappShareUrl(message: string, phone?: string | null) {
  const digits = (phone || "").replace(/\D/g, "");
  const target = digits.length >= 10 ? `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}` : "https://wa.me/";
  return `${target}?text=${encodeURIComponent(message)}`;
}
