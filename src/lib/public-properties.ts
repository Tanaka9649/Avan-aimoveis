import { and, desc, eq, isNotNull } from "drizzle-orm";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import type { Property } from "@/data/properties";

// Explicit projection: private addresses, coordinates and commissions never leave the server.
export async function publicProperties(slug?: string): Promise<Property[]> {
  const rows = await getDb().select({ id: properties.id, code: properties.code, slug: properties.slug, title: properties.title, type: properties.type, city: properties.city, state: properties.state, neighborhood: properties.neighborhood, priceCents: properties.priceCents, bedrooms: properties.bedrooms, bathrooms: properties.bathrooms, parkingSpaces: properties.parkingSpaces, area: properties.privateArea, description: properties.description, features: properties.features })
    .from(properties).where(and(eq(properties.status, "disponivel"), isNotNull(properties.publishedAt), slug ? eq(properties.slug, slug) : undefined)).orderBy(desc(properties.publishedAt)).limit(slug ? 1 : 200);
  const ids=rows.map(row=>row.id); const photos=ids.length?await getDb().select({id:propertyPhotos.id,propertyId:propertyPhotos.propertyId,isCover:propertyPhotos.isCover,position:propertyPhotos.position}).from(propertyPhotos):[];
  return rows.map((row) => {const gallery=photos.filter(photo=>photo.propertyId===row.id).sort((a,b)=>Number(b.isCover)-Number(a.isCover)||a.position-b.position).map(photo=>`/api/property-photos/${photo.id}`);return { ...row, area: Number(row.area || 0), image: gallery[0]||"/property-placeholder.svg", gallery: gallery.length?gallery:["/property-placeholder.svg"] };});
}
