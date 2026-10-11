import { GetObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { PHOTO_BUCKET, storageClient, tenantStorageKey } from "@/lib/storage";
import { validBrandingAsset } from "@/lib/branding-upload";

export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string; asset: string }> }) {
  const { tenantId, asset } = await params;
  if (!z.uuid().safeParse(tenantId).success || !validBrandingAsset(asset)) return new NextResponse(null, { status: 404 });
  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: tenantStorageKey(tenantId, `branding/${asset}`) }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream() as ReadableStream, { headers: {
      "Content-Type": object.ContentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return new NextResponse(null, { status: 404 }); }
}
