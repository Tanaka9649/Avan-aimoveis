"use server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { users, sessions, activityLogs, reminderSettings, clients } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { defaultAccess, modules } from "@/lib/permissions";
import { hashPassword } from "@/lib/security";
type State = { message: string; ok: boolean };
export async function createAccount(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const p = z.object({ name: z.string().trim().min(2).max(160), email: z.email().max(254), password: z.string().min(12).max(128) }).safeParse(Object.fromEntries(form));
  if (!p.success) return { ok: false, message: "Informe nome, e-mail válido e senha de 12 a 128 caracteres." };
  const id = randomUUID();
  try {
    const db = getDb();
    await db.batch([
      db.insert(users).values({ id, name: p.data.name, email: p.data.email.toLowerCase(), passwordHash: await hashPassword(p.data.password), role: "equipe", active: false, access: defaultAccess }),
      db.insert(activityLogs).values({ userId: admin.id, entityType: "user", entityId: id, action: "account_created_pending" }),
    ]);
  } catch { return { ok: false, message: "Não foi possível criar. Verifique se o e-mail já está cadastrado." }; }
  revalidatePath("/painel/configuracoes");
  return { ok: true, message: "Conta criada, aguardando sua aprovação. Compartilhe a senha por um canal seguro." };
}
export async function updateAccount(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const scope = z.enum(["all", "own"]).safeParse(form.get("scope"));
  const selected = z.array(z.enum(modules)).safeParse(form.getAll("modules"));
  if (!id.success || !scope.success || !selected.success) return { ok: false, message: "Permissões inválidas." };
  const db = getDb();
  const [target] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, id.data), eq(users.role, "equipe"))).limit(1);
  if (!target) return { ok: false, message: "Apenas contas da equipe podem ser alteradas aqui." };
  try {
    await db.batch([
      db.update(users).set({ active: form.get("active") === "on", access: { modules: selected.data, clients: scope.data }, updatedAt: new Date() }).where(and(eq(users.id, id.data), eq(users.role, "equipe"))),
      db.delete(sessions).where(eq(sessions.userId, id.data)),
      db.insert(activityLogs).values({ userId: admin.id, entityType: "user", entityId: id.data, action: "permissions_updated", details: { active: form.get("active") === "on", modules: selected.data, clients: scope.data } }),
    ]);
  } catch { return { ok: false, message: "Falha ao salvar permissões." }; }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Permissões salvas. As sessões anteriores foram encerradas." };
}
export async function saveReminders(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.array(z.email().max(254)).min(1).max(50).safeParse(String(form.get("recipients") || "").split(/[\s,;]+/).filter(Boolean).map((s) => s.toLowerCase()));
  if (!parsed.success) return { ok: false, message: "Informe de 1 a 50 e-mails válidos, separados por linha ou vírgula." };
  const values = { panel: form.get("panel") === "on", email: form.get("email") === "on", recipients: [...new Set(parsed.data)], updatedAt: new Date() };
  try {
    const db = getDb();
    await db.batch([
      db.insert(reminderSettings).values({ key: "visits", ...values }).onConflictDoUpdate({ target: reminderSettings.key, set: values }),
      db.insert(activityLogs).values({ userId: admin.id, entityType: "settings", action: "reminders_updated" }),
    ]);
  } catch { return { ok: false, message: "Não foi possível salvar os lembretes." }; }
  revalidatePath("/painel/configuracoes");
  return { ok: true, message: "Preferências salvas. Envio de e-mails aguarda conexão do serviço." };
}
export async function assignClient(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.object({ clientId: z.uuid(), userId: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Selecione cliente e responsável." };
  const db = getDb();
  const [target] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, parsed.data.userId), eq(users.active, true))).limit(1);
  if (!target) return { ok: false, message: "Responsável indisponível." };
  const [client] = await db.select({ id: clients.id }).from(clients).where(eq(clients.id, parsed.data.clientId)).limit(1);
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  try {
    await db.batch([
      db.update(clients).set({ assignedTo: target.id, updatedAt: new Date() }).where(eq(clients.id, client.id)),
      db.insert(activityLogs).values({ userId: admin.id, entityType: "client", entityId: client.id, action: "assigned", details: { userId: target.id } }),
    ]);
  } catch { return { ok: false, message: "Não foi possível atribuir o cliente." }; }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Responsável atualizado." };
}
