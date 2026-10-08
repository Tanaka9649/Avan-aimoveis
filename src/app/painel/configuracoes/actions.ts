"use server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { users, sessions, activityLogs, reminderSettings, clients, tenantMemberships, tenants } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { defaultAccess, modules } from "@/lib/permissions";
import { hashPassword } from "@/lib/security";

type State = { message: string; ok: boolean };

export async function createAccount(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.object({ name: z.string().trim().min(2).max(160), email: z.email().max(254), password: z.string().min(12).max(128) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Informe nome, e-mail válido e senha de 12 a 128 caracteres." };
  const email = parsed.data.email.toLowerCase();
  const db = getDb();
  try {
    let [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (!user) {
      [user] = await db.insert(users).values({ id: randomUUID(), name: parsed.data.name, email, passwordHash: await hashPassword(parsed.data.password), role: "equipe", active: true, access: defaultAccess }).returning({ id: users.id });
    }
    const membershipId = randomUUID();
    await db.batch([
      db.insert(tenantMemberships).values({ id: membershipId, tenantId: admin.tenantId, userId: user.id, role: "agent", status: "invited", permissions: defaultAccess, invitedAt: new Date() }).onConflictDoNothing(),
      db.insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "membership", entityId: membershipId, action: "account_created_pending" }),
    ]);
  } catch {
    return { ok: false, message: "Não foi possível criar. Verifique se o e-mail já pertence a esta equipe." };
  }
  revalidatePath("/painel/configuracoes");
  return { ok: true, message: "Conta criada e pendente de aprovação neste tenant." };
}

export async function updateAccount(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const id = z.uuid().safeParse(form.get("id"));
  const scope = z.enum(["all", "own"]).safeParse(form.get("scope"));
  const selected = z.array(z.enum(modules)).safeParse(form.getAll("modules"));
  if (!id.success || !scope.success || !selected.success) return { ok: false, message: "Permissões inválidas." };
  const db = getDb();
  const [target] = await db.select({ id: tenantMemberships.id, userId: tenantMemberships.userId }).from(tenantMemberships).where(and(eq(tenantMemberships.id, id.data), eq(tenantMemberships.tenantId, admin.tenantId))).limit(1);
  if (!target) return { ok: false, message: "Conta não encontrada nesta empresa." };
  const active = form.get("active") === "on";
  try {
    await db.batch([
      db.update(tenantMemberships).set({ status: active ? "active" : "suspended", permissions: { modules: selected.data, clients: scope.data }, updatedAt: new Date(), activatedAt: active ? new Date() : null }).where(and(eq(tenantMemberships.id, target.id), eq(tenantMemberships.tenantId, admin.tenantId))),
      db.delete(sessions).where(and(eq(sessions.tenantId, admin.tenantId), eq(sessions.userId, target.userId))),
      db.insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "membership", entityId: target.id, action: "permissions_updated", details: { active, modules: selected.data, clients: scope.data } }),
    ]);
  } catch {
    return { ok: false, message: "Falha ao salvar permissões." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Permissões deste tenant foram salvas e as sessões correspondentes encerradas." };
}

export async function saveReminders(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.array(z.email().max(254)).min(1).max(50).safeParse(String(form.get("recipients") || "").split(/[\s,;]+/).filter(Boolean).map((value) => value.toLowerCase()));
  if (!parsed.success) return { ok: false, message: "Informe de 1 a 50 e-mails válidos, separados por linha ou vírgula." };
  const values = { panel: form.get("panel") === "on", email: form.get("email") === "on", recipients: [...new Set(parsed.data)], updatedAt: new Date() };
  try {
    const db = getDb();
    const [existing] = await db.select({ key: reminderSettings.key }).from(reminderSettings).where(and(eq(reminderSettings.tenantId, admin.tenantId), eq(reminderSettings.key, "visits"))).limit(1);
    await db.batch([
      existing
        ? db.update(reminderSettings).set(values).where(and(eq(reminderSettings.tenantId, admin.tenantId), eq(reminderSettings.key, "visits")))
        : db.insert(reminderSettings).values({ tenantId: admin.tenantId, key: "visits", ...values }),
      db.insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "settings", action: "reminders_updated" }),
    ]);
  } catch {
    return { ok: false, message: "Não foi possível salvar os lembretes." };
  }
  revalidatePath("/painel/configuracoes");
  return { ok: true, message: "Preferências salvas. Envio de e-mails aguarda conexão do serviço." };
}

export async function assignClient(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.object({ clientId: z.uuid(), userId: z.uuid() }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Selecione cliente e responsável." };
  const db = getDb();
  const [target] = await db.select({ id: users.id }).from(users).innerJoin(tenantMemberships, and(eq(tenantMemberships.userId, users.id), eq(tenantMemberships.tenantId, admin.tenantId), eq(tenantMemberships.status, "active"))).where(eq(users.id, parsed.data.userId)).limit(1);
  if (!target) return { ok: false, message: "Responsável indisponível nesta empresa." };
  const [client] = await db.select({ id: clients.id }).from(clients).where(and(eq(clients.id, parsed.data.clientId), eq(clients.tenantId, admin.tenantId))).limit(1);
  if (!client) return { ok: false, message: "Cliente não encontrado." };
  try {
    await db.batch([
      db.update(clients).set({ assignedTo: target.id, updatedAt: new Date() }).where(and(eq(clients.id, client.id), eq(clients.tenantId, admin.tenantId))),
      db.insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "client", entityId: client.id, action: "assigned", details: { userId: target.id } }),
    ]);
  } catch {
    return { ok: false, message: "Não foi possível atribuir o cliente." };
  }
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Responsável atualizado." };
}


export async function saveTenantBranding(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const parsed = z.object({
    name: z.string().trim().min(2).max(180),
    phone: z.string().trim().max(30),
    whatsapp: z.string().trim().max(30),
    email: z.union([z.literal(""), z.email().max(254)]),
    logoLight: z.union([z.literal(""), z.url().max(2000)]),
    logoDark: z.union([z.literal(""), z.url().max(2000)]),
    favicon: z.union([z.literal(""), z.url().max(2000)]),
    primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    secondaryColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    accentColor: z.string().regex(/^#[0-9a-f]{6}$/i),
    siteTitle: z.string().trim().max(180),
    siteDescription: z.string().trim().max(320),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: "Revise a identidade visual e os dados de contato." };
  const data = parsed.data;
  try {
    await getDb().batch([
      getDb().update(tenants).set({
        name: data.name,
        phone: data.phone || null,
        whatsapp: data.whatsapp || null,
        email: data.email || null,
        branding: { logoLight: data.logoLight || undefined, logoDark: data.logoDark || undefined, favicon: data.favicon || undefined },
        site: { primaryColor: data.primaryColor, secondaryColor: data.secondaryColor, accentColor: data.accentColor, title: data.siteTitle || undefined, description: data.siteDescription || undefined },
        updatedAt: new Date(),
      }).where(eq(tenants.id, admin.tenantId)),
      getDb().insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "tenant", entityId: admin.tenantId, action: "branding_updated" }),
    ]);
  } catch {
    return { ok: false, message: "Não foi possível salvar a identidade visual." };
  }
  revalidatePath("/", "layout");
  revalidatePath("/painel", "layout");
  return { ok: true, message: "Identidade visual e contatos atualizados." };
}

export async function saveCustomDomain(_: State, form: FormData): Promise<State> {
  const admin = await requireAdmin();
  const raw = String(form.get("customDomain") || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  const parsed = z.union([z.literal(""), z.string().regex(/^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/)]).safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Informe apenas um domínio válido, sem caminho." };
  try {
    await getDb().batch([
      getDb().update(tenants).set({ customDomain: parsed.data || null, domainStatus: parsed.data ? "verifying" : "pending", updatedAt: new Date() }).where(eq(tenants.id, admin.tenantId)),
      getDb().insert(activityLogs).values({ tenantId: admin.tenantId, userId: admin.id, entityType: "tenant_domain", entityId: admin.tenantId, action: parsed.data ? "domain_verification_requested" : "domain_removed", details: { domain: parsed.data || null } }),
    ]);
  } catch {
    return { ok: false, message: "Não foi possível salvar. Verifique se o domínio já pertence a outra empresa." };
  }
  revalidatePath("/painel/configuracoes");
  return { ok: true, message: parsed.data ? "Domínio salvo. A verificação DNS está pendente." : "Domínio personalizado removido." };
}
