import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyDocuments } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { DOCUMENT_BUCKET, storageClient } from "@/lib/storage";

export const runtime = "nodejs";
async function find(id: string) { return (await getDb().select().from(propertyDocuments).where(eq(propertyDocuments.id, id)).limit(1))[0]; }
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis"); const { id } = await params; if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const document = await find(id); if (!document) return new NextResponse(null, { status: 404 });
  try { const object = await storageClient().send(new GetObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: document.storagePath })); if (!object.Body) return new NextResponse(null, { status: 404 }); return new NextResponse(object.Body.transformToWebStream() as ReadableStream, { headers: { "Content-Type": document.mime, "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.originalName)}`, "Cache-Control": "private, no-store" } }); } catch { return new NextResponse(null, { status: 404 }); }
}
export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireModule("imoveis"); const { id } = await params; const document = await find(id); if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
  await storageClient().send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: document.storagePath })); await getDb().delete(propertyDocuments).where(eq(propertyDocuments.id, id)); return NextResponse.json({ ok: true });
}
