import { withApiErrors } from "@/lib/api-errors";
import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { propertyDocuments } from "@/db/schema";
import { requireWriteModule } from "@/lib/access";
import { DOCUMENT_BUCKET, storageClient } from "@/lib/storage";
import { validateUploadBytes } from "@/lib/upload";
export const runtime = "nodejs";
async function handlePOST(_: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  const user = await requireWriteModule("imoveis");
  const { id, documentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(documentId).success) return new NextResponse(null, { status: 400 });
  const db = getDb();
  const scope = and(eq(propertyDocuments.tenantId, user.tenantId), eq(propertyDocuments.propertyId, id), eq(propertyDocuments.id, documentId));
  const [document] = await db.select().from(propertyDocuments).where(scope).limit(1);
  if (!document) return new NextResponse(null, { status: 404 });
  if (document.uploadStatus !== "ready") {
    const client = storageClient();
    const key = document.storagePath + ".pending";
    try {
      const head = await client.send(new HeadObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: key }));
      if (!head.ETag) throw new Error("missing_etag");
      const object = await client.send(new GetObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: key, Range: "bytes=0-63", IfMatch: head.ETag }));
      if (!object.Body) throw new Error("missing_body");
      const invalid = head.ContentType !== document.mime || head.ContentLength !== document.size ? "Arquivo diferente do declarado." : validateUploadBytes({ name: document.originalName, type: document.mime, size: document.size }, await object.Body.transformToByteArray(), "document");
      if (invalid) {
        await client.send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: key }));
        await db.delete(propertyDocuments).where(scope);
        return NextResponse.json({ error: invalid }, { status: 400 });
      }
      await client.send(new CopyObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: document.storagePath, CopySource: `${DOCUMENT_BUCKET}/${key}`, CopySourceIfMatch: head.ETag }));
      await db.update(propertyDocuments).set({ uploadStatus: "ready" }).where(scope);
      await client.send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: key }));
    } catch { return NextResponse.json({ error: "Não foi possível confirmar o documento." }, { status: 502 }); }
  }
  return NextResponse.json({ document: { id: document.id, originalName: document.originalName, mime: document.mime, size: document.size } });
}

export const POST = withApiErrors(handlePOST);
