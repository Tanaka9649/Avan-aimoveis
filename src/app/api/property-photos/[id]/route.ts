import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos, tenants } from "@/db/schema";
import { isPhotoVariant, variantKey, type PhotoVariant } from "@/lib/photos";
import { isPubliclyVisible } from "@/lib/property-publication";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { tenantOperational } from "@/lib/tenant";
import { currentUser } from "@/lib/auth";
import { canUseModule } from "@/lib/entitlements";
import { canAccess } from "@/lib/permissions";

export const runtime = "nodejs";

/**
 * Serves one photo at one size.
 *
 * Every request rechecks publication and tenant state before revalidating bytes.
 * A public image must stop being served immediately after unpublication.
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
      tenantId: propertyPhotos.tenantId,
      tenantStatus: tenants.status,
      storagePath: propertyPhotos.storagePath,
      variants: propertyPhotos.variants,
      processingStatus: propertyPhotos.processingStatus,
      status: properties.status,
      publishedAt: properties.publishedAt,
    })
    .from(propertyPhotos)
    .innerJoin(
      properties,
      and(
        eq(properties.id, propertyPhotos.propertyId),
        eq(properties.tenantId, propertyPhotos.tenantId),
      ),
    )
    .innerJoin(tenants, eq(tenants.id, propertyPhotos.tenantId))
    .where(eq(propertyPhotos.id, id))
    .limit(1);
  if (!photo?.tenantId || !tenantOperational(photo.tenantStatus)) return new NextResponse(null, { status: 404 });

  const isPublic = isPubliclyVisible(photo);
  if (!isPublic) {
    const user = await currentUser();
    if (!user || user.tenantId !== photo.tenantId || !canAccess(user, "imoveis") || !await canUseModule(user.tenantId, "imoveis")) {
      return new NextResponse(null, { status: 404 });
    }
  }

  if (photo.processingStatus !== "ready") return processingPlaceholder(photo.processingStatus);

  const key = variantKey(photo, variant);
  const cacheControl = isPublic ? "private, no-cache, must-revalidate" : "private, no-store";
  const ifNoneMatch = request.headers.get("if-none-match") || undefined;

  try {
    // Let storage compare the content version, not only a stable object pathname.
    // Authorization above still runs even when the object has not changed.
    const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, IfNoneMatch: ifNoneMatch }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream() as ReadableStream, {
      headers: {
        "Content-Type": object.ContentType || "image/webp",
        "Cache-Control": cacheControl,
        ...(object.ETag ? { ETag: object.ETag } : {}),
        "Content-Disposition": "inline",
        ...(object.ContentLength ? { "Content-Length": String(object.ContentLength) } : {}),
      },
    });
  } catch (error) {
    if (ifNoneMatch && error && typeof error === "object" && "$metadata" in error &&
      (error.$metadata as { httpStatusCode?: number })?.httpStatusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { "Cache-Control": cacheControl } });
    }
    return new NextResponse(null, { status: 404 });
  }
}

function processingPlaceholder(status: string) {
  const label = status === "failed" ? "Visualização indisponível" : "Preparando visualização";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#171a20"/><path d="M255 298l54-61 39 42 28-31 49 50H255z" fill="#303743"/><circle cx="286" cy="205" r="18" fill="#303743"/><text x="320" y="350" text-anchor="middle" fill="#a8b0bd" font-family="Arial,sans-serif" font-size="16">${label}</text></svg>`;
  return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "private, no-store", "X-Photo-Status": status } });
}
