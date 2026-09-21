import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { count, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { propertyPhotos } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { processPropertyPhoto } from "@/lib/photo-pipeline";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH = 4;
const pendingFilter = sql`${propertyPhotos.variants} = '{}'::jsonb`;

/** How many photos uploaded before the variant pipeline still serve one oversized file. */
export async function GET() {
  await requireModule("imoveis");
  const [pending] = await getDb().select({ value: count() }).from(propertyPhotos).where(pendingFilter);
  return NextResponse.json({ pending: Number(pending.value) }, { headers: { "cache-control": "no-store" } });
}

/**
 * Generates the missing thumbnail and medium sizes for photos uploaded before the pipeline existed.
 *
 * The original file is kept untouched and reused as the "full" variant, so nothing is re-encoded,
 * no quality is lost and no existing URL changes. Runs in small batches so it fits comfortably in
 * one serverless invocation; the panel calls it until nothing is pending.
 */
export async function POST() {
  await requireModule("imoveis");
  const db = getDb();
  const photos = await db
    .select({ id: propertyPhotos.id, storagePath: propertyPhotos.storagePath })
    .from(propertyPhotos)
    .where(pendingFilter)
    .limit(BATCH);

  let processed = 0;
  const failed: string[] = [];
  for (const photo of photos) {
    try {
      const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.storagePath }));
      if (!object.Body) throw new Error("objeto vazio");
      const original = Buffer.from(await object.Body.transformToByteArray());
      const result = await processPropertyPhoto(original, ["thumb", "medium"]);
      const base = photo.storagePath.replace(/\.[^.]+$/, "");
      const variants: Record<string, string> = { full: photo.storagePath };
      await Promise.all(result.variants.map(async (variant) => {
        const key = `${base}-${variant.name}.webp`;
        variants[variant.name] = key;
        await storageClient().send(new PutObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, Body: variant.body, ContentType: "image/webp", CacheControl: "public, max-age=31536000, immutable" }));
      }));
      await db.update(propertyPhotos).set({ variants, blurData: result.blurData }).where(eq(propertyPhotos.id, photo.id));
      processed += 1;
    } catch (error) {
      console.error("photo_variant_backfill_failed", photo.id, error instanceof Error ? error.message : "unknown");
      failed.push(photo.id);
    }
  }

  const [pending] = await db.select({ value: count() }).from(propertyPhotos).where(pendingFilter);
  return NextResponse.json({ processed, failed, pending: Number(pending.value) }, { headers: { "cache-control": "no-store" } });
}
