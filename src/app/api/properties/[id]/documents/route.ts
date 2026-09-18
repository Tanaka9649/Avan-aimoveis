import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { documentCategories, properties, propertyDocuments } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { DOCUMENT_BUCKET, storageClient } from "@/lib/storage";
import { safeFileName, validateUpload } from "@/lib/upload";

export const runtime = "nodejs";
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis"); const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Imóvel inválido." }, { status: 400 });
  const db = getDb(); const [property] = await db.select({ id: properties.id }).from(properties).where(eq(properties.id, id)).limit(1);
  if (!property) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });
  const form = await request.formData(); const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Selecione um documento." }, { status: 400 });
  const invalid = validateUpload(file, "document"); if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
  let [category] = await db.select({ id: documentCategories.id }).from(documentCategories).where(eq(documentCategories.entityType, "property")).limit(1);
  if (!category) [category] = await db.insert(documentCategories).values({ name: "Documentos do imóvel", entityType: "property" }).returning({ id: documentCategories.id });
  const documentId = randomUUID(); const key = `properties/${id}/documents/${documentId}-${safeFileName(file.name)}`;
  try {
    await storageClient().send(new PutObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: key, Body: Buffer.from(await file.arrayBuffer()), ContentType: file.type }));
    const [document] = await db.insert(propertyDocuments).values({ id: documentId, propertyId: id, categoryId: category.id, storagePath: key, originalName: file.name.slice(0, 240), mime: file.type, size: file.size }).returning({ id: propertyDocuments.id, originalName: propertyDocuments.originalName, mime: propertyDocuments.mime, size: propertyDocuments.size });
    return NextResponse.json({ document }, { status: 201 });
  } catch { return NextResponse.json({ error: "Não foi possível enviar o documento." }, { status: 500 }); }
}
