import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { currentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const user = await currentUser();
  const [photo] = await getDb().select({ path: propertyPhotos.storagePath }).from(propertyPhotos).innerJoin(properties, eq(properties.id, propertyPhotos.propertyId)).where(user ? eq(propertyPhotos.id, id) : and(eq(propertyPhotos.id, id), eq(properties.status, "disponivel"), isNotNull(properties.publishedAt))).limit(1);
  if (!photo) return new NextResponse(null, { status: 404 });
  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: photo.path }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream() as ReadableStream, { headers: { "Content-Type": object.ContentType || "image/webp", "Cache-Control": user ? "private, max-age=60" : "public, max-age=31536000, immutable", "Content-Disposition": "inline" } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
