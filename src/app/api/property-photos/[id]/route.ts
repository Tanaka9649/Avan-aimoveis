import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import { isPhotoVariant, variantKey, type PhotoVariant } from "@/lib/photos";
import { isPubliclyVisible } from "@/lib/property-publication";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * Serves one photo at one size.
 *
 * Storage keys are immutable — replacing a photo creates a new id and new keys — so a hit can be
 * cached for a year and the ETag turns a repeat visit into a 304 with no body and no storage read.
 * The session lookup only runs for photos that are not publicly visible, which keeps the public
 * catalogue at one database round trip per image instead of two.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const requested = new URL(request.url).searchParams.get("v") || "full";
  const variant: PhotoVariant = isPhotoVariant(requested) ? requested : "full";

  const [photo] = await getDb()
    .select({
      storagePath: propertyPhotos.storagePath,
      variants: propertyPhotos.variants,
      status: properties.status,
      publishedAt: properties.publishedAt,
    })
    .from(propertyPhotos)
    .innerJoin(properties, eq(properties.id, propertyPhotos.propertyId))
    .where(eq(propertyPhotos.id, id))
    .limit(1);
  if (!photo) return new NextResponse(null, { status: 404 });

  const isPublic = isPubliclyVisible(photo);
  if (!isPublic && !(await currentUser())) return new NextResponse(null, { status: 404 });

  const key = variantKey(photo, variant);
  const etag = `"${id}-${variant}"`;
  const cacheControl = isPublic ? "public, max-age=31536000, immutable" : "private, max-age=86400, immutable";
  if (request.headers.get("if-none-match") === etag)
    return new NextResponse(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } });

  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream() as ReadableStream, {
      headers: {
        "Content-Type": object.ContentType || "image/webp",
        "Cache-Control": cacheControl,
        ETag: etag,
        "Content-Disposition": "inline",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
      },
    });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}
