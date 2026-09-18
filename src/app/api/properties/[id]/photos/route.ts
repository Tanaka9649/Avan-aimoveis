import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { count, eq, max } from "drizzle-orm";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { MAX_PROPERTY_PHOTOS, safeFileName, validateUpload } from "@/lib/upload";
import { z } from "zod";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Imóvel inválido." }, { status: 400 });
  const db = getDb();
  const [property] = await db.select({ id: properties.id, title: properties.title }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  const form = await request.formData();
  const files = form.getAll("files").filter((value): value is File => value instanceof File);
  if (!files.length) return NextResponse.json({ error: "Selecione pelo menos uma foto." }, { status: 400 });
  const [{ value: current }, { value: last }] = await Promise.all([
    db.select({ value: count() }).from(propertyPhotos).where(eq(propertyPhotos.propertyId, id)).then((r) => r[0]),
    db.select({ value: max(propertyPhotos.position) }).from(propertyPhotos).where(eq(propertyPhotos.propertyId, id)).then((r) => r[0]),
  ]);
  if (Number(current) + files.length > MAX_PROPERTY_PHOTOS) return NextResponse.json({ error: "Cada imóvel pode ter no máximo 10 fotos." }, { status: 400 });
  const created = [];
  try {
    for (const [index, file] of files.entries()) {
      const invalid = validateUpload(file, "photo");
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const bytes = Buffer.from(await file.arrayBuffer());
      const optimized = await sharp(bytes, { failOn: "error" }).rotate().resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true }).webp({ quality: 84, effort: 4 }).toBuffer();
      const photoId = randomUUID();
      const key = `properties/${id}/photos/${photoId}-${safeFileName(file.name).replace(/\.[^.]+$/, "")}.webp`;
      await storageClient().send(new PutObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, Body: optimized, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
      const [photo] = await db.insert(propertyPhotos).values({ id: photoId, propertyId: id, storagePath: key, alt: `${property.title} — foto ${Number(last || -1) + index + 2}`, position: Number(last || -1) + index + 1, isCover: Number(current) === 0 && index === 0 }).returning();
      created.push(photo);
    }
    return NextResponse.json({ photos: created }, { status: 201 });
  } catch (error) {
    console.error("property_photo_upload_failed", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Não foi possível processar as fotos. Tente novamente." }, { status: 500 });
  }
}
