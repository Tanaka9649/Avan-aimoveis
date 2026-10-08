"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, clients, deals, properties, visits } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { formatOperationDateTime, parseOperationDateTime } from "@/lib/datetime";

const visitInput = z.object({ clientId: z.uuid(), propertyId: z.uuid(), dealId: z.union([z.uuid(), z.literal("")]), scheduledAt: z.string().min(1), notes: z.string().trim().max(4000), status: z.enum(["agendada", "realizada", "cancelada", "nao_compareceu"]) });

export async function saveVisit(_: { ok: boolean; message: string }, formData: FormData) {
  const user = await requireModule("visitas");
  const parsed = visitInput.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Revise cliente, imóvel, data e horário." };
  const at = parseOperationDateTime(parsed.data.scheduledAt);
  if (!at) return { ok: false, message: "Informe a data e o horário da visita." };
  const db = getDb();
  const [clientRows, propertyRows, dealRows] = await Promise.all([
    db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, user.tenantId))).limit(1),
    db.select({ id: properties.id }).from(properties).where(and(eq(properties.id, parsed.data.propertyId), eq(properties.tenantId, user.tenantId))).limit(1),
    parsed.data.dealId ? db.select({ id: deals.id }).from(deals).where(and(eq(deals.id, parsed.data.dealId), eq(deals.tenantId, user.tenantId), eq(deals.clientId, parsed.data.clientId))).limit(1) : Promise.resolve([]),
  ]);
  const client = clientRows[0];
  const property = propertyRows[0];
  if (!client || !property || (parsed.data.dealId && !dealRows[0])) return { ok: false, message: "Cliente, imóvel ou oportunidade não está mais disponível." };
  await db.batch([
    db.insert(visits).values({ tenantId: user.tenantId, clientId: client.id, propertyId: property.id, dealId: parsed.data.dealId || null, assignedTo: user.id, scheduledAt: at, notes: parsed.data.notes || null, status: parsed.data.status }),
    db.insert(activities).values({ tenantId: user.tenantId, clientId: client.id, dealId: parsed.data.dealId || null, userId: user.id, type: "visita", description: `Visita agendada para ${formatOperationDateTime(at)}` }),
  ]);
  revalidatePath("/painel/visitas");
  return { ok: true, message: "Visita salva." };
}

export async function updateVisit(formData: FormData) {
  const user = await requireModule("visitas");
  const parsed = z.object({ id: z.uuid(), status: z.enum(["agendada", "realizada", "cancelada", "nao_compareceu"]), feedback: z.string().trim().max(4000) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return;
  await getDb().update(visits).set({ status: parsed.data.status, feedback: parsed.data.feedback || null, updatedAt: new Date() }).where(and(eq(visits.id, parsed.data.id), eq(visits.tenantId, user.tenantId)));
  revalidatePath("/painel/visitas");
}
