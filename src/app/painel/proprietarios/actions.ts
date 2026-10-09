"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ilike, ne, or, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLogs, owners } from "@/db/schema";
import { requireModule } from "@/lib/access";
import { isValidBrazilianPhone, normalizeEmail, normalizePhone } from "@/lib/owner-identity";

const input = z.object({
  id: z.union([z.uuid(), z.literal("")]),
  name: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(8).max(30).refine(isValidBrazilianPhone, "Telefone inválido"),
  email: z.union([z.email(), z.literal("")]),
  notes: z.string().trim().max(10000),
});

async function findDuplicateOwner(tenantId: string, values: { name: string; phone: string; email: string }, exceptId?: string) {
  const db = getDb();
  const phone = normalizePhone(values.phone);
  const email = normalizeEmail(values.email);
  const matches: SQL[] = [];

  if (phone) {
    matches.push(sql`regexp_replace(coalesce(${owners.phone}, ''), '\\D', '', 'g') = ${phone}`);
  }
  if (email) {
    matches.push(sql`lower(trim(coalesce(${owners.email}, ''))) = ${email}`);
  }
  if (!phone && !email) {
    matches.push(ilike(owners.name, values.name.trim()));
  }

  const identity = matches.length === 1 ? matches[0] : or(...matches);
  if (!identity) return null;

  const clauses: SQL[] = [eq(owners.tenantId, tenantId), identity];
  if (exceptId) clauses.push(ne(owners.id, exceptId));

  const [duplicate] = await db
    .select({ id: owners.id, name: owners.name, phone: owners.phone, email: owners.email })
    .from(owners)
    .where(and(...clauses))
    .limit(1);

  return duplicate || null;
}

export async function saveOwner(_: { ok: boolean; message: string }, formData: FormData) {
  const user = await requireModule("proprietarios");
  const parsed = input.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, message: "Informe nome, telefone com DDD válido e, se preenchido, um e-mail válido." };
  }

  const db = getDb();
  let id = parsed.data.id;
  const duplicate = await findDuplicateOwner(user.tenantId, parsed.data, id || undefined);

  if (duplicate) {
    return {
      ok: false,
      message: `Já existe o proprietário ${duplicate.name} com o mesmo contato. Abra o cadastro existente em vez de criar outro.`,
    };
  }

  if (id) {
    const [owner] = await db
      .update(owners)
      .set({
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
        updatedAt: new Date(),
      })
      .where(and(eq(owners.id, id), eq(owners.tenantId, user.tenantId)))
      .returning({ id: owners.id });

    if (!owner) return { ok: false, message: "Proprietário não encontrado nesta empresa." };

    await db.insert(activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      entityType: "owner",
      entityId: id,
      action: "updated",
    });
  } else {
    const [row] = await db
      .insert(owners)
      .values({
        tenantId: user.tenantId,
        name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email || null,
        notes: parsed.data.notes || null,
      })
      .returning({ id: owners.id });

    id = row.id;

    await db.insert(activityLogs).values({
      tenantId: user.tenantId,
      userId: user.id,
      entityType: "owner",
      entityId: id,
      action: "created",
    });
  }

  revalidatePath("/painel/proprietarios", "layout");
  return { ok: true, message: "Proprietário salvo." };
}

export async function openOwner(formData: FormData) {
  await requireModule("proprietarios");
  const id = z.uuid().safeParse(formData.get("id"));
  if (id.success) redirect(`/painel/proprietarios/${id.data}`);
}
