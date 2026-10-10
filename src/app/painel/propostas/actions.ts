"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, clients, deals, properties, proposals, sales, stages } from "@/db/schema";
import { clientScope, requireModule } from "@/lib/access";
import { parseOperationDateTime } from "@/lib/datetime";

const money = z.coerce.number().positive().max(21474836.47).transform((value) => Math.round(value * 100));
const proposalStatuses = ["enviada", "em_negociacao", "contraproposta", "aceita", "recusada", "expirada"] as const;

export async function saveProposal(_: { ok: boolean; message: string }, formData: FormData) {
  const user = await requireModule("propostas");
  const parsed = z.object({ dealId: z.uuid(), propertyId: z.uuid(), advertised: money, amount: money, counter: z.union([money, z.literal("")]), validUntil: z.string(), status: z.enum(proposalStatuses), notes: z.string().trim().max(5000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revise os dados e os valores da proposta." };
  const valid = parsed.data.validUntil ? parseOperationDateTime(parsed.data.validUntil, { endOfDay: true }) : null;
  if (parsed.data.validUntil && !valid) return { ok: false, message: "Informe uma validade válida." };
  const db = getDb();
  const [dealRows, propertyRows] = await Promise.all([
    db.select({ id: deals.id, clientId: clients.id, isLost: stages.isLost }).from(deals).innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.tenantId, user.tenantId))).innerJoin(stages, and(eq(stages.id, deals.stageId), eq(stages.tenantId, user.tenantId))).where(and(eq(deals.id, parsed.data.dealId), eq(deals.tenantId, user.tenantId), clientScope(user))).limit(1),
    db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, parsed.data.propertyId), eq(properties.tenantId, user.tenantId))).limit(1),
  ]);
  if (!dealRows[0] || !propertyRows[0]) return { ok: false, message: "Oportunidade ou imóvel indisponível." };
  if (dealRows[0].isLost) return { ok: false, message: "Reabra a oportunidade perdida antes de criar uma proposta." };
  await db.batch([
    db.insert(proposals).values({ tenantId: user.tenantId, dealId: parsed.data.dealId, propertyId: parsed.data.propertyId, advertisedAmountCents: parsed.data.advertised, amountCents: parsed.data.amount, counterAmountCents: parsed.data.counter || null, validUntil: valid, status: parsed.data.status, notes: parsed.data.notes || null }),
    db.insert(activities).values({ tenantId: user.tenantId, dealId: parsed.data.dealId, clientId: dealRows[0].clientId, userId: user.id, type: "proposta", description: "Proposta registrada" }),
  ]);
  revalidatePath("/painel/propostas");
  return { ok: true, message: "Proposta salva." };
}

export async function updateProposal(formData: FormData) {
  const user = await requireModule("propostas");
  const parsed = z.object({ id: z.uuid(), status: z.enum(proposalStatuses) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await getDb().update(proposals).set({ status: parsed.data.status, updatedAt: new Date() }).where(and(eq(proposals.id, parsed.data.id), eq(proposals.tenantId, user.tenantId)));
  revalidatePath("/painel/propostas");
}

export async function saveSale(_: { ok: boolean; message: string }, formData: FormData) {
  const user = await requireModule("propostas");
  const parsed = z.object({ dealId: z.uuid(), propertyId: z.uuid(), proposalId: z.union([z.uuid(), z.literal("")]), advertised: money, amount: money, commissionPercent: z.coerce.number().min(0).max(100), soldAt: z.string().min(1), notes: z.string().trim().max(5000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revise os dados da venda." };
  const soldAt = parseOperationDateTime(parsed.data.soldAt);
  const commission = Math.round(parsed.data.amount * parsed.data.commissionPercent / 100);
  const db = getDb();
  const [won] = await db.select({ id: stages.id }).from(stages).where(and(eq(stages.tenantId, user.tenantId), eq(stages.isWon, true))).limit(1);
  if (!won || !soldAt) return { ok: false, message: "Confira a data e a etapa de fechamento." };
  const [deal] = await db.select({ id: deals.id, clientId: clients.id, stage: stages.name }).from(deals)
    .innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.tenantId, user.tenantId)))
    .innerJoin(stages, and(eq(stages.id, deals.stageId), eq(stages.tenantId, user.tenantId)))
    .where(and(eq(deals.id, parsed.data.dealId), eq(deals.tenantId, user.tenantId), clientScope(user))).limit(1);
  const [property] = await db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, parsed.data.propertyId), eq(properties.tenantId, user.tenantId))).limit(1);
  if (!deal || !property) return { ok: false, message: "Oportunidade ou imóvel indisponível." };
  if (deal.isLost) return { ok: false, message: "Reabra a oportunidade perdida antes de concluir a venda." };
  if (parsed.data.proposalId) {
    const [proposal] = await db.select({ id: proposals.id, status: proposals.status }).from(proposals).where(and(eq(proposals.tenantId, user.tenantId), eq(proposals.id, parsed.data.proposalId), eq(proposals.dealId, deal.id), eq(proposals.propertyId, property.id))).limit(1);
    if (!proposal) return { ok: false, message: "A proposta não pertence a esta oportunidade e imóvel." };
    if (proposal.status !== "aceita") return { ok: false, message: "Marque a proposta como aceita antes de concluir a venda." };
  }
  try {
    await db.batch([
      db.insert(sales).values({ tenantId: user.tenantId, dealId: deal.id, propertyId: property.id, proposalId: parsed.data.proposalId || null, advertisedAmountCents: parsed.data.advertised, amountCents: parsed.data.amount, commissionPercent: String(parsed.data.commissionPercent), commissionCents: commission, soldAt, notes: parsed.data.notes || null }),
      db.update(properties).set({ status: "vendido", updatedAt: new Date() }).where(and(eq(properties.id, property.id), eq(properties.tenantId, user.tenantId))),
      db.insert(activities).values({ tenantId: user.tenantId, dealId: deal.id, clientId: deal.clientId, userId: user.id, type: "venda", description: `Venda concluída. Oportunidade movida: ${deal.stage} → Ganho` }),
      db.update(deals).set({ stageId: won.id, stageEnteredAt: new Date(), lostReason: null, updatedAt: new Date() }).where(and(eq(deals.id, deal.id), eq(deals.tenantId, user.tenantId))),
      ...(parsed.data.proposalId ? [db.update(proposals).set({ status: "aceita", updatedAt: new Date() }).where(and(eq(proposals.id, parsed.data.proposalId), eq(proposals.tenantId, user.tenantId)))] : []),
    ]);
  } catch (error) {
    console.error("[crm/sale]", error instanceof Error ? error.message : "failed");
    return { ok: false, message: "Não foi possível concluir. Verifique se a oportunidade ou o imóvel já possui venda registrada." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Venda concluída e indicadores atualizados." };
}
