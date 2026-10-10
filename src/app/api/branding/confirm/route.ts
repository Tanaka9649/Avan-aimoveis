import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
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

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Não foi possível confirmar a imagem." }, { status: 400 });

  const file = parsed.data;
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

  const key = tenantStorageKey(admin.tenantId, `branding/${file.asset}`);
  try {
    const client = storageClient();
    const [head, firstBytes] = await Promise.all([
      client.send(new HeadObjectCommand({ Bucket: PHOTO_BUCKET, Key: key })),
      client.send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: key, Range: "bytes=0-63" })),
    ]);
    if (!firstBytes.Body) throw new Error("missing_body");
    const actualSize = Number(head.ContentLength || 0);
    const detected = detectBrandingMime(await firstBytes.Body.transformToByteArray());
    const normalizedDeclared = file.type === "image/vnd.microsoft.icon" ? "image/x-icon" : file.type;
    const normalizedStored = head.ContentType === "image/vnd.microsoft.icon" ? "image/x-icon" : head.ContentType;
    const valid = actualSize === file.size && normalizedStored === normalizedDeclared && detected === normalizedDeclared;
    if (!valid) {
      await client.send(new DeleteObjectCommand({ Bucket: PHOTO_BUCKET, Key: key })).catch(() => undefined);
      return NextResponse.json({ error: "O conteúdo da imagem não corresponde ao arquivo selecionado." }, { status: 400 });
    }

    return NextResponse.json({
      publicUrl: `/api/branding/${admin.tenantId}/${file.asset}`,
    }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar a imagem enviada." }, { status: 502 });
  }
}
