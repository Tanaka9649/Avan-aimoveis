import { withApiErrors } from "@/lib/api-errors";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { documentCategories, properties, propertyDocuments } from "@/db/schema";
import { requireWriteModule } from "@/lib/access";
import { canConsumeResource } from "@/lib/entitlements";
import { DOCUMENT_BUCKET, signedUploadUrl, tenantStorageKey } from "@/lib/storage";
import { safeFileName, validateUploadMetadata } from "@/lib/upload";
export const runtime = "nodejs";
async function handlePOST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireWriteModule("imoveis");
  const { id } = await params;
  const parsed = z.object({ name: z.string().min(1).max(240), type: z.string().max(100), size: z.number().int().positive() }).safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(id).success || !parsed.success) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  const file = parsed.data;
  const invalid = validateUploadMetadata(file, "document");
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  const db = getDb();
  const [property] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, id), eq(properties.tenantId, user.tenantId))).limit(1);
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  if (!await canConsumeResource(user.tenantId, "max_documents", 1) || !await canConsumeResource(user.tenantId, "max_storage_bytes", file.size)) return NextResponse.json({ error: "Limite de documentos ou armazenamento atingido." }, { status: 409 });
  let [category] = await db.select({ id: documentCategories.id }).from(documentCategories).where(and(eq(documentCategories.tenantId, user.tenantId), eq(documentCategories.entityType, "property"))).limit(1);
  if (!category) [category] = await db.insert(documentCategories).values({ tenantId: user.tenantId, name: "Documentos do imóvel", entityType: "property" }).returning({ id: documentCategories.id });
  const documentId = randomUUID();
  const key = tenantStorageKey(user.tenantId, `properties/${id}/documents/${documentId}-${safeFileName(file.name)}`);
  try {
    const uploadUrl = await signedUploadUrl(DOCUMENT_BUCKET, key + ".pending", file.type, file.size);
    await db.insert(propertyDocuments).values({ tenantId: user.tenantId, id: documentId, propertyId: id, categoryId: category.id, storagePath: key, originalName: file.name, mime: file.type, size: file.size, uploadStatus: "uploading" });
    return NextResponse.json({ documentId, uploadUrl, contentType: file.type }, { status: 201, headers: { "cache-control": "no-store" } });
  } catch { return NextResponse.json({ error: "Não foi possível preparar o envio. Confira os limites do plano." }, { status: 409 }); }
}

export const POST = withApiErrors(handlePOST);
