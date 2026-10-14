import { claimUpload, releaseUpload } from "@/lib/upload-lifecycle";
import { reportOperationFailure } from "@/lib/observability";
import { withApiErrors } from "@/lib/api-errors";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { brandingAssets } from "@/db/schema";
import { z } from "zod";
import { brandingActor } from "@/lib/branding-access";
import { PHOTO_BUCKET, storageClient, tenantStorageKey } from "@/lib/storage";
import { detectMime } from "@/lib/upload";

export const runtime = "nodejs";

const input = z.object({
  asset: z.string().regex(/^[0-9a-f-]{36}\.(?:png|jpg|webp|ico)$/i),
  name: z.string().min(1).max(240),
  type: z.enum(["image/png", "image/jpeg", "image/webp", "image/x-icon", "image/vnd.microsoft.icon"]),
  size: z.number().int().positive().max(5 * 1024 * 1024),
  favicon: z.boolean().default(false),
});

function extension(name: string) {
  return name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
}

function detectBrandingMime(bytes: Uint8Array) {
  const standard = detectMime(bytes);
  if (standard) return standard;
  if (bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return "image/x-icon";
  return null;
}

async function handlePOST(request: Request) {
  const admin = await brandingActor(request);
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Não foi possível confirmar a imagem." }, { status: 400 });

  const file = parsed.data;
  const scope = and(eq(brandingAssets.tenantId, admin.tenantId), eq(brandingAssets.asset, file.asset));
  const [reservation] = await getDb().select().from(brandingAssets).where(scope).limit(1);
  if (!reservation || reservation.sizeBytes !== file.size || reservation.mime !== file.type) return NextResponse.json({ error: "Envio não autorizado." }, { status: 400 });
  if (reservation.confirmedAt) return NextResponse.json({ publicUrl: `/api/branding/${admin.tenantId}/${file.asset}` });
  const ext = extension(file.name);
  const allowedExtension =
    file.type === "image/png" ? ext === "png" :
    file.type === "image/jpeg" ? ext === "jpg" || ext === "jpeg" :
    file.type === "image/webp" ? ext === "webp" :
    (file.type === "image/x-icon" || file.type === "image/vnd.microsoft.icon") ? ext === "ico" :
    false;
  if (!allowedExtension || (!file.favicon && file.type.includes("icon"))) {
    return NextResponse.json({ error: "O arquivo não corresponde ao formato permitido." }, { status: 400 });
  }

  if (!await claimUpload("branding_assets", admin.tenantId, reservation.id)) return NextResponse.json({ error: "Envio expirado ou em processamento." }, { status: 409 });
  const key = tenantStorageKey(admin.tenantId, `branding/pending/${file.asset}`);
  try {
    const client = storageClient();
    const head = await client.send(new HeadObjectCommand({ Bucket: PHOTO_BUCKET, Key: key }));
    if (!head.ETag) throw new Error("missing_etag");
    const firstBytes = await client.send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, Range: "bytes=0-63", IfMatch: head.ETag }));
    if (!firstBytes.Body) throw new Error("missing_body");
    const actualSize = Number(head.ContentLength || 0);
    const detected = detectBrandingMime(await firstBytes.Body.transformToByteArray());
    const normalizedDeclared = file.type === "image/vnd.microsoft.icon" ? "image/x-icon" : file.type;
    const normalizedStored = head.ContentType === "image/vnd.microsoft.icon" ? "image/x-icon" : head.ContentType;
    const valid = actualSize === file.size && normalizedStored === normalizedDeclared && detected === normalizedDeclared;
    if (!valid) {
      await client.send(new DeleteObjectCommand({ Bucket: PHOTO_BUCKET, Key: key })).catch(() => undefined);
      await getDb().delete(brandingAssets).where(scope);
      return NextResponse.json({ error: "O conteúdo da imagem não corresponde ao arquivo selecionado." }, { status: 400 });
    }

    // The upload URL addresses only pending/. Public keys are never writable by clients.
    const finalKey = tenantStorageKey(admin.tenantId, `branding/${file.asset}`);
    await client.send(new CopyObjectCommand({ Bucket: PHOTO_BUCKET, Key: finalKey, CopySource: `${PHOTO_BUCKET}/${key}`, CopySourceIfMatch: head.ETag }));
    await getDb().update(brandingAssets).set({ confirmedAt: new Date() }).where(scope);
    await client.send(new DeleteObjectCommand({ Bucket: PHOTO_BUCKET, Key: key }));
    return NextResponse.json({
      publicUrl: `/api/branding/${admin.tenantId}/${file.asset}`,
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    reportOperationFailure("upload", "branding_confirmation_failed");
    return NextResponse.json({ error: "Não foi possível confirmar a imagem enviada." }, { status: 502 });
  } finally { await releaseUpload("branding_assets", admin.tenantId, reservation.id); }
}

export const POST = withApiErrors(handlePOST);
