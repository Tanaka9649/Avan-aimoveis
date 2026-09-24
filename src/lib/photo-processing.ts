import "server-only";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { propertyPhotos } from "@/db/schema";
import { processPropertyPhoto } from "@/lib/photo-pipeline";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";

export async function generatePhotoVariants(photoId: string) {
  const db = getDb();
  const [photo] = await db.select({
    id: propertyPhotos.id,
    storagePath: propertyPhotos.storagePath,
    originalMime: propertyPhotos.originalMime,
  }).from(propertyPhotos).where(eq(propertyPhotos.id, photoId)).limit(1);
  if (!photo) return;

  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath }));
    if (!object.Body) throw new Error("original ausente");
    const original = Buffer.from(await object.Body.transformToByteArray());
    const processed = await processPropertyPhoto(original, undefined, photo.originalMime);
    const base = photo.storagePath.replace(/-original\.[^.]+$/, "").replace(/\.[^.]+$/, "");
    const variants: Record<string, string> = {};
    await Promise.all(processed.variants.map(async (variant) => {
      const key = `${base}-${variant.name}.webp`;
      variants[variant.name] = key;
      await storageClient().send(new PutObjectCommand({
        Bucket: PHOTO_BUCKET,
        Key: key,
        Body: variant.body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      }));
    }));
    await db.update(propertyPhotos).set({
      variants,
      blurData: processed.blurData,
      width: processed.width,
      height: processed.height,
      processingStatus: "ready",
    }).where(eq(propertyPhotos.id, photo.id));
  } catch (error) {
    await db.update(propertyPhotos).set({ processingStatus: "failed" }).where(eq(propertyPhotos.id, photo.id)).catch(() => undefined);
    console.error("property_photo_processing_failed", { photoId, reason: error instanceof Error ? error.message : "unknown" });
  }
}
