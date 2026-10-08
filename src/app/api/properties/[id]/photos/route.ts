import { randomUUID } from "node:crypto";
import { and, count, eq, inArray, max } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PHOTO_BUCKET, signedUploadUrl, tenantStorageKey } from "@/lib/storage";
import { MAX_PROPERTY_PHOTOS, normalizeUploadMetadata, safeFileName, validateUploadMetadata } from "@/lib/upload";

export const runtime = "nodejs";

const input = z.object({ files: z.array(z.object({ name: z.string().min(1).max(240), type: z.string().max(100), size: z.number().int().positive() })).min(1).max(MAX_PROPERTY_PHOTOS) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("imoveis");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Imóvel inválido." }, { status: 400 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise as fotos selecionadas." }, { status: 400 });
  const files = parsed.data.files.map((file) => normalizeUploadMetadata(file, "photo"));
  const invalid = files.map((file) => validateUploadMetadata(file, "photo")).find(Boolean);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const db = getDb();
  const [property] = await db.select({ id: properties.id, title: properties.title }).from(properties).where(and(eq(properties.id, id), eq(properties.tenantId, user.tenantId))).limit(1);
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  const photoScope = and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.propertyId, id));
  const [{ value: current }, { value: last }] = await Promise.all([
    db.select({ value: count() }).from(propertyPhotos).where(photoScope).then((rows) => rows[0]),
    db.select({ value: max(propertyPhotos.position) }).from(propertyPhotos).where(photoScope).then((rows) => rows[0]),
  ]);
  if (Number(current) + files.length > MAX_PROPERTY_PHOTOS) return NextResponse.json({ error: "Cada imóvel pode ter no máximo 10 fotos." }, { status: 400 });

  const reservations = files.map((file, index) => {
    const photoId = randomUUID();
    const clean = safeFileName(file.name);
    const ext = clean.match(/\.[^.]+$/)?.[0].toLowerCase() || "";
    const key = tenantStorageKey(user.tenantId, `properties/${id}/photos/${photoId}-original${ext}`);
    return { id: photoId, key, file, position: Number(last ?? -1) + index + 1, isCover: Number(current) === 0 && index === 0 };
  });

  try {
    await db.insert(propertyPhotos).values(reservations.map((reservation, index) => ({
      tenantId: user.tenantId,
      id: reservation.id,
      propertyId: id,
      storagePath: reservation.key,
      originalName: reservation.file.name,
      originalMime: reservation.file.type,
      sizeBytes: reservation.file.size,
      processingStatus: "uploading",
      alt: `${property.title} — foto ${Number(last ?? -1) + index + 2}`,
      position: reservation.position,
      isCover: reservation.isCover,
      variants: {},
    })));
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o envio das fotos." }, { status: 500 });
  }

  try {
    const uploads = await Promise.all(reservations.map(async ({ id: photoId, key, file, position, isCover }) => ({
      photoId,
      uploadUrl: await signedUploadUrl(PHOTO_BUCKET, key, file.type, file.size),
      contentType: file.type,
      position,
      isCover,
    })));
    return NextResponse.json({ uploads }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    await db.delete(propertyPhotos).where(and(eq(propertyPhotos.tenantId, user.tenantId), inArray(propertyPhotos.id, reservations.map(({ id: photoId }) => photoId)))).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível autorizar o envio das fotos." }, { status: 502 });
  }
}
