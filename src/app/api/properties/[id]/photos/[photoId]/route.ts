import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";

const input = z.object({ action: z.enum(["cover", "position"]), position: z.number().int().min(0).max(9).optional() });
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  await requireModule("imoveis"); const { id, photoId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(photoId).success) return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });
  const db = getDb();
  if (parsed.data.action === "cover") await db.batch([db.update(propertyPhotos).set({ isCover: false }).where(eq(propertyPhotos.propertyId, id)), db.update(propertyPhotos).set({ isCover: true }).where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id)))]);
  else await db.update(propertyPhotos).set({ position: parsed.data.position! }).where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id)));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  await requireModule("imoveis"); const { id, photoId } = await params;
  const db = getDb(); const [photo] = await db.select().from(propertyPhotos).where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id))).limit(1);
  if (!photo) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  try { await storageClient().send(new DeleteObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath })); } catch { return NextResponse.json({ error: "Não foi possível excluir a foto do armazenamento." }, { status: 502 }); }
  await db.delete(propertyPhotos).where(eq(propertyPhotos.id, photo.id));
  if (photo.isCover) { const [next] = await db.select({ id: propertyPhotos.id }).from(propertyPhotos).where(eq(propertyPhotos.propertyId, id)).limit(1); if (next) await db.update(propertyPhotos).set({ isCover: true }).where(eq(propertyPhotos.id, next.id)); }
  return NextResponse.json({ ok: true });
}
