import { GetObjectCommand } from "@aws-sdk/client-s3";
import { createHash } from "node:crypto";
import { and, eq, isNotNull } from "drizzle-orm";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos, tenants } from "@/db/schema";
import { tenantOperational } from "@/lib/tenant";
import { canAccess } from "@/lib/permissions";
import { canUseModule } from "@/lib/entitlements";
import { currentUser } from "@/lib/auth";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { variantKey } from "@/lib/photos";
import { PUBLIC_STATUS } from "@/lib/property-publication";
import { generatePropertyPdf } from "@/lib/property-pdf";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportOperationFailure } from "@/lib/observability";

export const runtime = "nodejs";

// Small, short-lived process cache coalesces repeated work. Authorization and
// publication are checked on EVERY request; no browser/CDN cache of private PDFs.
const rendered = new Map<string, { expires: number; bytes: Promise<Uint8Array> }>();
const MAX_CACHE = 16;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  try {
    const user = await currentUser();
    const db = getDb();
    const privateAccess = user && canAccess(user, "imoveis") && await canUseModule(user.tenantId, "imoveis");
    const visibility = privateAccess
      ? and(eq(properties.id, id), eq(properties.tenantId, user.tenantId))
      : and(eq(properties.id, id), eq(properties.status, PUBLIC_STATUS), isNotNull(properties.publishedAt));
    const [row] = await db.select({ property: properties, tenant: tenants })
      .from(properties).innerJoin(tenants, eq(tenants.id, properties.tenantId)).where(visibility).limit(1);
    if (!row || !tenantOperational(row.tenant.status)) return new NextResponse(null, { status: 404 });

    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!await checkRateLimit("pdf:" + (user?.id || ip), 30, 60_000)) {
      return NextResponse.json({ error: "Aguarde um minuto antes de gerar outra ficha." }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
    }
    const [photo] = await db.select({ storagePath: propertyPhotos.storagePath, variants: propertyPhotos.variants })
      .from(propertyPhotos).where(and(eq(propertyPhotos.tenantId, row.tenant.id), eq(propertyPhotos.propertyId, id), eq(propertyPhotos.isCover, true))).limit(1);
    const input = { ...row.property, tenantName: row.tenant.name, contact: row.tenant.phone || row.tenant.whatsapp };
    const key = createHash("sha256").update(JSON.stringify({ tenant: row.tenant.id, input, photo })).digest("hex");
    const now = Date.now();
    for (const [entryKey, entry] of rendered) if (entry.expires <= now) rendered.delete(entryKey);
    let entry = rendered.get(key);
    if (!entry) {
      // Shared PostgreSQL limiter also bounds cold instances / distributed requests.
      if (!await checkRateLimit("pdf-render:" + row.tenant.id + ":" + id, 20, 60_000)) {
        return NextResponse.json({ error: "Ficha temporariamente ocupada. Tente novamente em um minuto." }, { status: 429, headers: { "Retry-After": "60" } });
      }
      if (rendered.size >= MAX_CACHE) rendered.delete(rendered.keys().next().value!);
      const bytes = (async () => {
        let cover: Buffer | undefined;
        if (photo) {
          try {
            const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: variantKey(photo, "medium") }), { abortSignal: AbortSignal.timeout(10_000) });
            if (object.Body) cover = await sharp(Buffer.from(await object.Body.transformToByteArray()), { limitInputPixels: 40_000_000 }).rotate().resize({ width: 1280, withoutEnlargement: true }).jpeg({ quality: 86 }).toBuffer();
          } catch { reportOperationFailure("pdf_cover", "cover_unavailable"); }
        }
        return generatePropertyPdf(input, cover);
      })();
      entry = { expires: now + 120_000, bytes };
      rendered.set(key, entry);
      void bytes.catch(() => rendered.delete(key));
    }
    const filename = row.property.slug.replace(/[^a-zA-Z0-9_-]/g, "-");
    return new NextResponse(Buffer.from(await entry.bytes), { headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="' + filename + '.pdf"',
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    reportOperationFailure("pdf", "generation_failed");
    return NextResponse.json({ error: "Não foi possível gerar a ficha agora. Tente novamente." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
