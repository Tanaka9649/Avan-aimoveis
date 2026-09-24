import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, opportunityAttachments } from "@/db/schema";
import { requireOpportunity } from "@/lib/opportunity-access";
import { DOCUMENT_BUCKET, storageClient } from "@/lib/storage";
import { validateUploadBytes } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(_: Request, { params }: { params: Promise<{ id: string; attachmentId: string }> }) {
  const { id, attachmentId } = await params;
  if (!z.uuid().safeParse(id).success || !z.uuid().safeParse(attachmentId).success) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  const { user, opportunity } = await requireOpportunity(id);
  if (!opportunity || !user) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
  const db = getDb();
  const [attachment] = await db.select().from(opportunityAttachments).where(and(eq(opportunityAttachments.id, attachmentId), eq(opportunityAttachments.opportunityId, id))).limit(1);
  if (!attachment) return NextResponse.json({ error: "Arquivo não encontrado." }, { status: 404 });
  if (attachment.uploadStatus === "ready") return NextResponse.json({ attachment: serialize(attachment) });

  try {
    const head = await storageClient().send(new HeadObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey }));
    const firstBytes = await storageClient().send(new GetObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey, Range: "bytes=0-63" }));
    if (!firstBytes.Body) throw new Error("arquivo ausente");
    const actualSize = Number(head.ContentLength || 0);
    const invalid = head.ContentType !== attachment.mimeType || actualSize !== attachment.sizeBytes
      ? "O arquivo recebido não corresponde ao envio preparado."
      : validateUploadBytes({ name: attachment.originalName, type: attachment.mimeType, size: actualSize }, await firstBytes.Body.transformToByteArray(), "document");
    if (invalid) {
      await storageClient().send(new DeleteObjectCommand({ Bucket: DOCUMENT_BUCKET, Key: attachment.storageKey })).catch(() => undefined);
      await db.delete(opportunityAttachments).where(eq(opportunityAttachments.id, attachment.id));
      return NextResponse.json({ error: invalid }, { status: 400 });
    }
    await db.batch([
      db.update(opportunityAttachments).set({ uploadStatus: "ready" }).where(eq(opportunityAttachments.id, attachment.id)),
      db.insert(activities).values({ dealId: id, clientId: opportunity.clientId, userId: user.id, type: "attachment_added", description: activityDescription(attachment.category) }),
    ]);
    return NextResponse.json({ attachment: serialize({ ...attachment, uploadStatus: "ready" }) }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível confirmar o arquivo enviado." }, { status: 502 });
  }
}

function serialize(attachment: typeof opportunityAttachments.$inferSelect) {
  return { id: attachment.id, displayName: attachment.displayName, originalName: attachment.originalName, mimeType: attachment.mimeType, sizeBytes: attachment.sizeBytes, category: attachment.category, createdAt: attachment.createdAt.toISOString() };
}

function activityDescription(category: string | null) {
  if (category === "Contrato") return "Contrato anexado.";
  if (category === "Simulação de financiamento") return "Simulação de financiamento adicionada.";
  return "Documento anexado à oportunidade.";
}
