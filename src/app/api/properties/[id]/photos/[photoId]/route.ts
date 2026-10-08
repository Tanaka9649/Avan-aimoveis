import { DeleteObjectsCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";

const input = z.object({ action: z.enum(["cover", "position"]), position: z.number().int().min(0).max(9).optional() });

export async function GET(_: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await requireModule("imoveis");
  const { id, photoId } = await params;
  const [photo] = await getDb().select({ processingStatus: propertyPhotos.processingStatus, blurData: propertyPhotos.blurData }).from(propertyPhotos).where(and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id))).limit(1);
  if (!photo) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  return NextResponse.json(photo, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await requireModule("imoveis");
  const { id, photoId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(photoId).success) return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Alteração inválida." }, { status: 400 });
  const db = getDb();
  const photoScope = and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.propertyId, id));
  const targetScope = and(photoScope, eq(propertyPhotos.id, photoId));
  const [target] = await db.select({ id: propertyPhotos.id }).from(propertyPhotos).where(targetScope).limit(1);
  if (!target) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  if (parsed.data.action === "cover") await db.batch([db.update(propertyPhotos).set({ isCover: false }).where(photoScope), db.update(propertyPhotos).set({ isCover: true }).where(targetScope)]);
  else await db.update(propertyPhotos).set({ position: parsed.data.position! }).where(targetScope);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  const user = await requireModule("imoveis");
  const { id, photoId } = await params;
  const db = getDb();
  const scope = and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id));
  const [photo] = await db.select().from(propertyPhotos).where(scope).limit(1);
  if (!photo) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  const keys = [...new Set([photo.storagePath, ...Object.values(photo.variants || {})])];
  try {
    await storageClient().send(new DeleteObjectsCommand({ Bucket: PHOTO_BUCKET, Delete: { Objects: keys.map((Key) => ({ Key })), Quiet: true } }));
  } catch {
    return NextResponse.json({ error: "Não foi possível excluir a foto do armazenamento." }, { status: 502 });
  }
  await db.delete(propertyPhotos).where(scope);
  if (photo.isCover) {
    const [next] = await db.select({ id: propertyPhotos.id }).from(propertyPhotos).where(and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.propertyId, id))).limit(1);
    if (next) await db.update(propertyPhotos).set({ isCover: true }).where(and(eq(propertyPhotos.tenantId, user.tenantId), eq(propertyPhotos.id, next.id)));
  }
  return NextResponse.json({ ok: true });
}
