import { randomUUID } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { opportunityAttachments } from "@/db/schema";
import { attachmentCategories } from "@/lib/opportunity-attachments";
import { requireOpportunity } from "@/lib/opportunity-access";
import { DOCUMENT_BUCKET, signedUploadUrl } from "@/lib/storage";
import { safeFileName, validateUploadMetadata } from "@/lib/upload";

export const runtime = "nodejs";

const input = z.object({ files: z.array(z.object({
  name: z.string().min(1).max(240),
  type: z.string().max(100),
  size: z.number().int().positive(),
  displayName: z.string().trim().min(1).max(240).optional(),
  category: z.enum(attachmentCategories).nullable().optional(),
})).min(1).max(10) });

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Oportunidade inválida." }, { status: 400 });
  const { opportunity } = await requireOpportunity(id);
  if (!opportunity) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
  const rows = await getDb().select({
    id: opportunityAttachments.id,
    displayName: opportunityAttachments.displayName,
    originalName: opportunityAttachments.originalName,
    mimeType: opportunityAttachments.mimeType,
    sizeBytes: opportunityAttachments.sizeBytes,
    category: opportunityAttachments.category,
    createdAt: opportunityAttachments.createdAt,
  }).from(opportunityAttachments).where(and(eq(opportunityAttachments.opportunityId, id), eq(opportunityAttachments.uploadStatus, "ready"))).orderBy(desc(opportunityAttachments.createdAt));
  return NextResponse.json({ attachments: rows.map((row) => ({ ...row, createdAt: row.createdAt.toISOString() })) }, { headers: { "cache-control": "private, no-store" } });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: "Oportunidade inválida." }, { status: 400 });
  const { user, opportunity } = await requireOpportunity(id);
  if (!opportunity || !user) return NextResponse.json({ error: "Oportunidade não encontrada." }, { status: 404 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revise os arquivos selecionados." }, { status: 400 });
  const invalid = parsed.data.files.map((file) => validateUploadMetadata(file, "document")).find(Boolean);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  const reservations = parsed.data.files.map((file) => {
    const attachmentId = randomUUID();
    const key = `opportunities/${id}/${attachmentId}-${safeFileName(file.name)}`;
    return { attachmentId, key, file };
  });
  try {
    await getDb().insert(opportunityAttachments).values(reservations.map(({ attachmentId, key, file }) => ({
      id: attachmentId,
      opportunityId: id,
      storageKey: key,
      originalName: file.name,
      displayName: file.displayName || file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      category: file.category || null,
      uploadedBy: user.id,
      uploadStatus: "uploading",
    })));
  } catch {
    return NextResponse.json({ error: "Não foi possível preparar o envio dos arquivos." }, { status: 500 });
  }
  let uploads: Array<{ attachmentId: string; uploadUrl: string; contentType: string }>;
  try {
    uploads = await Promise.all(reservations.map(async ({ attachmentId, key, file }) => ({
      attachmentId,
      uploadUrl: await signedUploadUrl(DOCUMENT_BUCKET, key, file.type, file.size),
      contentType: file.type,
    })));
  } catch {
    await getDb().delete(opportunityAttachments).where(inArray(opportunityAttachments.id, reservations.map(({ attachmentId }) => attachmentId))).catch(() => undefined);
    return NextResponse.json({ error: "Não foi possível autorizar o envio dos arquivos." }, { status: 502 });
  }
  return NextResponse.json({ uploads }, { status: 201, headers: { "cache-control": "no-store" } });
}
