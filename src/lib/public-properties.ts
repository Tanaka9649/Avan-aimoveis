import { and, desc, eq, inArray, isNotNull, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import type { PublicPhoto, PublicPropertyCard, PublicPropertyDetail } from "@/data/properties";
import { NEUTRAL_BLUR, PHOTO_PLACEHOLDER, photoUrl } from "./photos";
import { PUBLIC_STATUS } from "./property-publication";

/** The catalogue's visibility rule, expressed once, for every public query. */
export const publiclyVisible = () => and(eq(properties.status, PUBLIC_STATUS), isNotNull(properties.publishedAt));

// Explicit projection: private addresses, coordinates, commissions, owners, documents and
// internal notes are never selected, so they cannot leak through a public route.
const cardColumns = {
  id: properties.id,
  code: properties.code,
  slug: properties.slug,
  title: properties.title,
  type: properties.type,
  city: properties.city,
  state: properties.state,
  neighborhood: properties.neighborhood,
  priceCents: properties.priceCents,
  bedrooms: properties.bedrooms,
  suites: properties.suites,
  bathrooms: properties.bathrooms,
  parkingSpaces: properties.parkingSpaces,
  area: properties.privateArea,
};

type CardRow = { [K in keyof typeof cardColumns]: K extends "area" ? string | null : K extends "priceCents" | "bedrooms" | "suites" | "bathrooms" | "parkingSpaces" ? number : string };

const toPhoto = (photo: { id: string; alt: string; blurData: string | null }, size: "thumb" | "medium"): PublicPhoto => ({
  id: photo.id,
  url: photoUrl(photo.id, size),
  blur: photo.blurData || NEUTRAL_BLUR,
  alt: photo.alt,
});

const toCard = (row: CardRow, cover: PublicPhoto | null): PublicPropertyCard => ({ ...row, area: Number(row.area || 0), cover });

/**
 * Catalogue listing. Loads one cover photo per property — never the whole gallery — so a page of
 * cards costs one extra query and one small thumbnail each, instead of up to ten full pictures.
 */
export async function publicPropertyCards(limit = 200): Promise<PublicPropertyCard[]> {
  const rows = await getDb().select(cardColumns).from(properties).where(publiclyVisible()).orderBy(desc(properties.publishedAt)).limit(limit);
  if (!rows.length) return [];
  const covers = await coverPhotos(rows.map((row) => row.id));
  return rows.map((row) => toCard(row, covers.get(row.id) || null));
}

/** One published property with its full gallery, or null when it is not publicly visible. */
export async function publicProperty(slug: string): Promise<PublicPropertyDetail | null> {
  const [row] = await getDb()
    .select({ ...cardColumns, description: properties.description, features: properties.features, publishedAt: properties.publishedAt, updatedAt: properties.updatedAt })
    .from(properties)
    .where(and(publiclyVisible(), eq(properties.slug, slug)))
    .limit(1);
  if (!row) return null;
  const photos = await getDb()
    .select({ id: propertyPhotos.id, alt: propertyPhotos.alt, blurData: propertyPhotos.blurData, isCover: propertyPhotos.isCover, position: propertyPhotos.position })
    .from(propertyPhotos)
    .where(eq(propertyPhotos.propertyId, row.id));
  const ordered = photos.sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.position - b.position);
  const gallery = ordered.map((photo) => toPhoto(photo, "medium"));
  return {
    ...toCard(row, gallery[0] ? { ...gallery[0], url: photoUrl(gallery[0].id, "thumb") } : null),
    description: row.description,
    features: row.features,
    gallery,
    publishedAt: row.publishedAt?.toISOString() || null,
    updatedAt: row.updatedAt?.toISOString() || null,
  };
}

/** Published properties similar to this one: same city, nearby price, never itself. */
export async function similarProperties(property: PublicPropertyCard, limit = 3): Promise<PublicPropertyCard[]> {
  const rows = await getDb()
    .select(cardColumns)
    .from(properties)
    .where(and(publiclyVisible(), ne(properties.id, property.id), or(eq(properties.city, property.city), eq(properties.type, property.type))))
    .orderBy(sql`abs(${properties.priceCents} - ${property.priceCents})`)
    .limit(limit);
  if (!rows.length) return [];
  const covers = await coverPhotos(rows.map((row) => row.id));
  return rows.map((row) => toCard(row, covers.get(row.id) || null));
}

/** Everything the sitemap needs, without loading descriptions or photos. */
export async function publishedPropertyRoutes() {
  return getDb().select({ slug: properties.slug, updatedAt: properties.updatedAt }).from(properties).where(publiclyVisible()).orderBy(desc(properties.publishedAt)).limit(5000);
}

async function coverPhotos(ids: string[]) {
  const photos = await getDb()
    .select({ id: propertyPhotos.id, propertyId: propertyPhotos.propertyId, alt: propertyPhotos.alt, blurData: propertyPhotos.blurData, isCover: propertyPhotos.isCover, position: propertyPhotos.position })
    .from(propertyPhotos)
    .where(inArray(propertyPhotos.propertyId, ids));
  const covers = new Map<string, PublicPhoto>();
  for (const photo of photos.sort((a, b) => Number(b.isCover) - Number(a.isCover) || a.position - b.position))
    if (!covers.has(photo.propertyId)) covers.set(photo.propertyId, toPhoto(photo, "thumb"));
  return covers;
}

export { PHOTO_PLACEHOLDER };
