import { withApiErrors } from "@/lib/api-errors";
import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyDocuments } from "@/db/schema";
import { requireModule, requireWriteModule } from "@/lib/access";
import { DOCUMENT_BUCKET, storageClient } from "@/lib/storage";

export const runtime = "nodejs";

async function find(id: string, tenantId: string) {
  return (await getDb().select().from(propertyDocuments).where(and(eq(propertyDocuments.id, id), eq(propertyDocuments.tenantId, tenantId))).limit(1))[0];
}

async function handleGET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireModule("imoveis");
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const document = await find(id, user.tenantId);
  if (!document || document.uploadStatus !== "ready") return new NextResponse(null, { status: 404 });
  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: document.storagePath }));
    if (!object.Body) return new NextResponse(null, { status: 404 });
    return new NextResponse(object.Body.transformToWebStream() as ReadableStream, { headers: { "Content-Type": document.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`, "Cache-Control": "private, no-store" } });
  } catch {
    return new NextResponse(null, { status: 404 });
  }
}

async function handleDELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireWriteModule("imoveis");
  const { id } = await params;
  const document = await find(id, user.tenantId);
  if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  await storageClient().send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: document.storagePath }));
  await getDb().delete(propertyDocuments).where(and(eq(propertyDocuments.id, id), eq(propertyDocuments.tenantId, user.tenantId)));
  return NextResponse.json({ ok: true });
}

export const GET = withApiErrors(handleGET);
export const DELETE = withApiErrors(handleDELETE);
