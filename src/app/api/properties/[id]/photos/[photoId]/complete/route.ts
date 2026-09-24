import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { generatePhotoVariants } from "@/lib/photo-processing";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { validateUploadBytes } from "@/lib/upload";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(_: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  await requireModule("imoveis");
  const { id, photoId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(photoId).success) return NextResponse.json({ error: "Foto inválida." }, { status: 400 });
  const db = getDb();
  const [photo] = await db.select().from(propertyPhotos).where(and(eq(propertyPhotos.id, photoId), eq(propertyPhotos.propertyId, id))).limit(1);
  if (!photo) return NextResponse.json({ error: "Foto não encontrada." }, { status: 404 });
  if (photo.processingStatus === "ready") return NextResponse.json({ photo: publicPhoto(photo) });

  try {
    const head = await storageClient().send(new HeadObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath }));
    const firstBytes = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath, Range: "bytes=0-63" }));
    if (!firstBytes.Body || !photo.originalName || !photo.originalMime || !photo.sizeBytes) throw new Error("reserva incompleta");
    const actualSize = Number(head.ContentLength || 0);
    const invalid = head.ContentType !== photo.originalMime || actualSize !== photo.sizeBytes
      ? "O arquivo recebido não corresponde ao envio preparado."
      : validateUploadBytes({ name: photo.originalName, type: photo.originalMime, size: actualSize }, await firstBytes.Body.transformToByteArray(), "photo");
    if (invalid) {
      await storageClient().send(new DeleteObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath })).catch(() => undefined);
      await db.delete(propertyPhotos).where(eq(propertyPhotos.id, photo.id));
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    await db.update(propertyPhotos).set({ processingStatus: "processing" }).where(eq(propertyPhotos.id, photo.id));
    after(() => generatePhotoVariants(photo.id));
    return NextResponse.json({ photo: publicPhoto({ ...photo, processingStatus: "processing" }) }, { status: 202, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar a foto enviada." }, { status: 502 });
  }
}

function publicPhoto(photo: typeof propertyPhotos.$inferSelect) {
  return { id: photo.id, alt: photo.alt, position: photo.position, isCover: photo.isCover, blurData: photo.blurData, processingStatus: photo.processingStatus };
}
