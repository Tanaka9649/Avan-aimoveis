import { NextResponse } from "next/server";
import { z } from "zod";
import { PHOTO_BUCKET, signedDownloadUrl, tenantStorageKey } from "@/lib/storage";

export const runtime = "nodejs";

const assetSchema = z.string().regex(/^[0-9a-f-]{36}\.(?:png|jpg|webp|svg|ico)$/i);

export async function GET(_request: Request, { params }: { params: Promise<{ tenantId: string; asset: string }> }) {
  const { tenantId, asset } = await params;
  if (!z.uuid().safeParse(tenantId).success || !assetSchema.safeParse(asset).success) {
    return NextResponse.json({ error: "Imagem inválida." }, { status: 400 });
  }
  try {
    const key = tenantStorageKey(tenantId, `branding/${asset}`);
    const url = await signedDownloadUrl(PHOTO_BUCKET, key, asset, true);
    return NextResponse.redirect(url, { status: 307, headers: { "cache-control": "public, max-age=300, s-maxage=300" } });
  } catch {
    return NextResponse.json({ error: "Imagem indisponível." }, { status: 404 });
  }
}
