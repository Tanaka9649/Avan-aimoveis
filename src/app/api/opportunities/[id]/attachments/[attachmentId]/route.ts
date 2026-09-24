import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, opportunityAttachments } from "@/db/schema";
import { attachmentCategories } from "@/lib/opportunity-attachments";
import { requireOpportunity } from "@/lib/opportunity-access";
import { DOCUMENT_BUCKET, signedDownloadUrl, storageClient } from "@/lib/storage";

export const runtime = "nodejs";

const editInput = z.object({ displayName: z.string().trim().min(1).max(240), category: z.enum(attachmentCategories).nullable() });

async function authorized(id: string, attachmentId: string, readyOnly = true) {
  const context = await requireOpportunity(id);
  if (!context.opportunity) return { ...context, attachment: undefined };
  const [attachment] = await getDb().select().from(opportunityAttachments).where(and(eq(opportunityAttachments.id, attachmentId), eq(opportunityAttachments.opportunityId, id), readyOnly ? eq(opportunityAttachments.uploadStatus, "ready") : undefined)).limit(1);
  return { ...context, attachment };
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(attachmentId).success) return new NextResponse(null, { status: 404 });
  const { opportunity, attachment } = await authorized(id, attachmentId);
  if (!opportunity || !attachment) return new NextResponse(null, { status: 404 });
  const inline = new URL(request.url).searchParams.get("view") === "1";
  const url = await signedDownloadUrl(DOCUMENT_BUCKET, attachment.storageKey, attachment.displayName, inline);
  return NextResponse.redirect(url, { headers: { "cache-control": "private, no-store", "referrer-policy": "no-referrer" } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  const parsed = editInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um nome de exibição válido." }, { status: 400 });
  const { opportunity, attachment } = await authorized(id, attachmentId);
  if (!opportunity || !attachment) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  const [updated] = await getDb().update(opportunityAttachments).set(parsed.data).where(eq(opportunityAttachments.id, attachment.id)).returning();
  return NextResponse.json({ attachment: serialize(updated) }, { headers: { "cache-control": "no-store" } });
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  const { user, opportunity, attachment } = await authorized(id, attachmentId, false);
  if (!user || !opportunity || !attachment) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  const db = getDb();
  if (attachment.uploadStatus !== "ready") {
    await storageClient().send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey })).catch(() => undefined);
    await db.delete(opportunityAttachments).where(eq(opportunityAttachments.id, attachment.id));
    return NextResponse.json({ ok: true });
  }
  let backup: Uint8Array;
  try {
    const object = await storageClient().send(new GetObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey }));
    if (!object.Body) throw new Error("arquivo ausente");
    backup = await object.Body.transformToByteArray();
    await storageClient().send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey }));
  } catch {
    return NextResponse.json({ error: "Não foi possível remover o arquivo do armazenamento." }, { status: 502 });
  }
  try {
    await db.batch([
      db.delete(opportunityAttachments).where(eq(opportunityAttachments.id, attachment.id)),
      db.insert(activities).values({ dealId: id, clientId: opportunity.clientId, userId: user.id, type: "attachment_removed", description: "Documento removido da oportunidade." }),
    ]);
    return NextResponse.json({ ok: true });
  } catch {
    await storageClient().send(new PutObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey, Body: backup, ContentType: attachment.mimeType })).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível concluir a exclusão. O arquivo foi preservado." }, { status: 500 });
  }
}

function serialize(attachment: typeof opportunityAttachments.$inferSelect) {
  return { id: attachment.id, displayName: attachment.displayName, originalName: attachment.originalName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, category: attachment.category, createdAt: attachment.createdAt.toISOString() };
}
