import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/access";
import { PHOTO_BUCKET, signedUploadUrl, tenantStorageKey } from "@/lib/storage";
import { brandingExtension, MAX_BRANDING_BYTES } from "@/lib/branding-upload";

export const runtime = "nodejs";

const input = z.object({
  name: z.string().min(1).max(240),
  type: z.string().min(1).max(100),
  size: z.number().int().positive().max(MAX_BRANDING_BYTES),
});

export async function POST(request: Request) {
  const admin = await requireAdmin();
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise o arquivo selecionado." }, { status: 400 });
  const extension = brandingExtension(parsed.data.type);
  if (!extension) return NextResponse.json({ error: "Use PNG, JPG, WEBP, SVG ou ICO." }, { status: 400 });

  const asset = randomUUID() + extension;
  const key = tenantStorageKey(admin.tenantId, `branding/${asset}`);
  try {
    const uploadUrl = await signedUploadUrl(PHOTO_BUCKET, key, parsed.data.type, parsed.data.size);
    return NextResponse.json({
      uploadUrl,
      publicUrl: `/api/branding/${admin.tenantId}/${asset}`,
      contentType: parsed.data.type,
    }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o envio da imagem." }, { status: 502 });
  }
}
