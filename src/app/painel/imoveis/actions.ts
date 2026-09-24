"use server";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, activityLogs, owners, propertyOwners, propertyPhotos } from "@/db/schema";
import { listInput } from "@/lib/client-input";
import { requireModule } from "@/lib/access";
import { propertyInput } from "@/lib/property-input";
import { canPublish, publicationBlockers, publicPropertyUrl } from "@/lib/property-publication";

export async function saveProperty(_previous: { error: string; id?: string; saved?: boolean }, formData: FormData): Promise<{ error: string; id?: string; saved?: boolean }> {
  const user = await requireModule("imoveis");
  const parsed = propertyInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Revise os campos: " + [...new Set(parsed.error.issues.map((issue) => issue.path.join(".")))].join(", ") };
  const rawId = formData.get("id");
  if (rawId && !z.uuid().safeParse(rawId).success) return { error: "Identificador inválido." };
  const id = typeof rawId === "string" && rawId ? rawId : randomUUID();
  const p = parsed.data;
  const ownerInput=z.object({ownerId:z.union([z.uuid(),z.literal("")]),ownerName:z.string().trim().max(160),ownerPhone:z.string().trim().max(30),ownerEmail:z.union([z.email(),z.literal("")]),features:listInput}).safeParse({ownerId:formData.get("ownerId")||"",ownerName:formData.get("ownerName")||"",ownerPhone:formData.get("ownerPhone")||"",ownerEmail:formData.get("ownerEmail")||"",features:formData.get("features")||""});
  if(!ownerInput.success)return {error:"Revise os dados do proprietário e características."};
  const owner=ownerInput.data;
  if(!owner.ownerId&&owner.ownerName&&owner.ownerName.length<2)return {error:"Informe o nome completo do proprietário."};
  const values = { code: p.code, title: p.title, slug: p.slug, type: p.type, priceCents: p.price, city: p.city, state: p.state, neighborhood: p.neighborhood, addressPrivate: p.address, description: p.description, bedrooms: p.bedrooms, bathrooms: p.bathrooms, parkingSpaces: p.parking, privateArea: p.area.toFixed(2), status: p.status, updatedAt: new Date() };
  // Publication is its own decision, never a side effect of the commercial status, so re-saving a
  // listing no longer republishes it and no longer resets the date it went live.
  const wantsPublication = formData.get("publish") === "1";
  let publication: { publishedAt?: Date | null; status?: typeof values.status } = {};
  try {
    const db = getDb();
    if(owner.ownerId){const [found]=await db.select({id:owners.id}).from(owners).where(eq(owners.id,owner.ownerId));if(!found)return {error:"Proprietário indisponível."};}
    let current: { publishedAt: Date | null } | undefined;
    if(rawId){const [found]=await db.select({id:properties.id,publishedAt:properties.publishedAt}).from(properties).where(and(eq(properties.id,id),ne(properties.status,"vendido")));if(!found)return {error:"Imóvel indisponível ou vendido."};current=found;}
    if (wantsPublication) {
      const [photos] = rawId ? await db.select({ value: count() }).from(propertyPhotos).where(and(eq(propertyPhotos.propertyId, id), eq(propertyPhotos.processingStatus, "ready"))) : [{ value: 0 }];
      const candidate = { status: p.status, title: p.title, priceCents: p.price, description: p.description, neighborhood: p.neighborhood, city: p.city, state: p.state, area: p.area, photoCount: Number(photos.value) };
      if (!canPublish(candidate))
        return { error: `Para publicar no site, complete: ${publicationBlockers(candidate).join(", ")}.`, id };
      // Publishing keeps the original go-live date, so re-publishing never rewrites history.
      publication = { publishedAt: current?.publishedAt ?? new Date(), status: "disponivel" };
    } else if (formData.get("publish") === "0") {
      publication = { publishedAt: null };
    }
    const ownerId=owner.ownerId||(owner.ownerName?randomUUID():null);
    const ownerQueries=[...(!owner.ownerId&&ownerId?[db.insert(owners).values({id:ownerId,name:owner.ownerName,phone:owner.ownerPhone,email:owner.ownerEmail||null})]:[]),...(ownerId?[db.insert(propertyOwners).values({propertyId:id,ownerId}).onConflictDoNothing()]:[])];
    if (rawId) {
      await db.batch([db.update(properties).set({...values,...publication,features:owner.features}).where(and(eq(properties.id,id),ne(properties.status,"vendido"))),...ownerQueries,db.insert(activityLogs).values({userId:user.id,entityType:"property",entityId:id,action:wantsPublication?"published":formData.get("publish")==="0"?"unpublished":"updated"})]);
    } else {
      await db.batch([
        db.insert(properties).values({ id, ...values, ...publication, features:owner.features }),
        ...ownerQueries,
        db.insert(activityLogs).values({ userId: user.id, entityType: "property", entityId: id, action: "create", details: { code: p.code, published: wantsPublication } }),
      ]);
    }
  } catch (error) {
    const details = [error, error && typeof error === "object" && "cause" in error ? error.cause : null]
      .filter(Boolean)
      .map((item) => String(item instanceof Error ? item.message : item))
      .join(" ");
    if (details.includes("properties_code_uq"))
      return { error: "O código informado já pertence a outro imóvel.", id };
    if (details.includes("properties_slug_uq"))
      return { error: "O endereço da página já pertence a outro imóvel.", id };
    console.error("[saveProperty] failed", { id, error });
    return { error: "Não foi possível salvar o imóvel. Tente novamente.", id };
  }
  revalidatePath("/", "layout");
  if (formData.get("intent") === "draft") return { error: "", id, saved: true };
  redirect("/painel/imoveis");
}

export async function duplicateProperty(formData: FormData) {
  const user = await requireModule("imoveis");
  const parsed = z.uuid().safeParse(formData.get("id")); if (!parsed.success) return;
  const db = getDb(); const [source] = await db.select().from(properties).where(eq(properties.id, parsed.data)).limit(1); if (!source) return;
  const id = randomUUID(); const suffix = id.slice(0, 6).toUpperCase();
  await db.batch([
    db.insert(properties).values({ ...source, id, code: `${source.code.slice(0, 20)}-${suffix}`, slug: `${source.slug.slice(0, 190)}-${id.slice(0, 6)}`, title: `${source.title} — cópia`, status: "rascunho", publishedAt: null, createdAt: new Date(), updatedAt: new Date() }),
    db.insert(activityLogs).values({ userId: user.id, entityType: "property", entityId: id, action: "duplicated", details: { sourceId: source.id, photosCopied: false } }),
  ]);
  revalidatePath("/painel/imoveis"); redirect(`/painel/imoveis/${id}`);
}

export type PublicationResult = { ok: boolean; message: string; url?: string; missing?: string[] };

/**
 * Publishes a listing straight from the panel — the card menu and the share dialog both call this,
 * so the requirements and the resulting URL are decided in exactly one place.
 */
export async function publishProperty(id: string): Promise<PublicationResult> {
  const user = await requireModule("imoveis");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Imóvel inválido." };
  const db = getDb();
  const [property] = await db
    .select({ id: properties.id, slug: properties.slug, status: properties.status, publishedAt: properties.publishedAt, title: properties.title, priceCents: properties.priceCents, description: properties.description, neighborhood: properties.neighborhood, city: properties.city, state: properties.state, area: properties.privateArea })
    .from(properties)
    .where(eq(properties.id, id))
    .limit(1);
  if (!property) return { ok: false, message: "Imóvel não encontrado." };
  if (property.status === "vendido") return { ok: false, message: "Imóveis vendidos não podem ser publicados." };
  const [photos] = await db.select({ value: count() }).from(propertyPhotos).where(and(eq(propertyPhotos.propertyId, id), eq(propertyPhotos.processingStatus, "ready")));
  const candidate = { ...property, area: property.area, photoCount: Number(photos.value) };
  if (!canPublish(candidate))
    return { ok: false, message: "Complete o cadastro antes de publicar.", missing: publicationBlockers(candidate) };
  await db.batch([
    db.update(properties).set({ status: "disponivel", publishedAt: property.publishedAt ?? new Date(), updatedAt: new Date() }).where(eq(properties.id, id)),
    db.insert(activityLogs).values({ userId: user.id, entityType: "property", entityId: id, action: "published", details: { slug: property.slug } }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Imóvel publicado no site.", url: publicPropertyUrl(property.slug) };
}

/** Removes the listing from the public catalogue without touching the record or its photos. */
export async function unpublishProperty(id: string): Promise<PublicationResult> {
  const user = await requireModule("imoveis");
  if (!z.uuid().safeParse(id).success) return { ok: false, message: "Imóvel inválido." };
  const db = getDb();
  const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!property) return { ok: false, message: "Imóvel não encontrado." };
  await db.batch([
    db.update(properties).set({ publishedAt: null, updatedAt: new Date() }).where(eq(properties.id, id)),
    db.insert(activityLogs).values({ userId: user.id, entityType: "property", entityId: id, action: "unpublished" }),
  ]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Imóvel removido do site." };
}
