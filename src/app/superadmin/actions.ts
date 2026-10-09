"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions, tenantModules, tenantSlugHistory, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { SESSION_COOKIE, TENANT_COOKIE } from "@/lib/auth";
import { moduleRegistry, validModuleCombination } from "@/lib/module-registry";
import { modules } from "@/lib/permissions";
import { hashToken, issueToken } from "@/lib/security";
import { auditTenantAction } from "@/lib/tenant-audit";
import { ROOT_TENANT_SLUG } from "@/lib/tenant";

type ActionState = { message: string; ok: boolean };

const tenantIdSchema = z.uuid();
const slugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const identitySchema = z.object({
  name: z.string().trim().min(2).max(180),
  slug: slugSchema,
  email: z.union([z.email(), z.literal("")]),
  phone: z.string().trim().max(30),
  whatsapp: z.string().trim().max(30),
});
const lifecycleSchema = z.object({
  status: z.enum(["configuring", "trial", "active", "suspended", "cancelled"]),
  plan: z.enum(["starter", "pro", "max", "custom"]),
});

function paths(tenantId: string) {
  revalidatePath("/superadmin");
  revalidatePath("/superadmin/empresas");
  revalidatePath("/superadmin/empresas/" + tenantId);
}

function failure(message: string): ActionState {
  return { message, ok: false };
}

export async function updateTenantIdentity(
  tenantIdValue: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();
  const tenantId = tenantIdSchema.safeParse(tenantIdValue);
  const parsed = identitySchema.safeParse({
    name: formData.get("name"),
    slug: formData.get("slug"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    whatsapp: formData.get("whatsapp"),
  });
  if (!tenantId.success || !parsed.success) return failure("Revise os dados de identidade.");

  const db = getDb();
  const [current] = await db.select({ id: tenants.id, slug: tenants.slug }).from(tenants).where(eq(tenants.id, tenantId.data)).limit(1);
  if (!current) return failure("Empresa não encontrada.");

  if (current.slug !== parsed.data.slug) {
    const [[duplicate], [historic]] = await Promise.all([
      db.select({ id: tenants.id }).from(tenants).where(and(eq(tenants.slug, parsed.data.slug), ne(tenants.id, tenantId.data))).limit(1),
      db.select({ tenantId: tenantSlugHistory.tenantId }).from(tenantSlugHistory).where(eq(tenantSlugHistory.slug, parsed.data.slug)).limit(1),
    ]);
    if (duplicate || historic) return failure("Este endereço já foi utilizado por outra empresa.");
    await db.insert(tenantSlugHistory).values({ tenantId: tenantId.data, slug: current.slug });
  }

  await db.update(tenants).set({
    name: parsed.data.name,
    slug: parsed.data.slug,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    whatsapp: parsed.data.whatsapp || null,
    updatedAt: new Date(),
  }).where(eq(tenants.id, tenantId.data));
  await auditTenantAction({
    tenantId: tenantId.data,
    actorUserId: actor.id,
    action: "tenant.identity_updated",
    entityType: "tenant",
    entityId: tenantId.data,
    metadata: { previousSlug: current.slug, slug: parsed.data.slug },
  });
  paths(tenantId.data);
  return { message: "Identidade atualizada.", ok: true };
}

export async function updateTenantLifecycle(
  tenantIdValue: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();
  const tenantId = tenantIdSchema.safeParse(tenantIdValue);
  const parsed = lifecycleSchema.safeParse({
    status: formData.get("status"),
    plan: formData.get("plan"),
  });
  if (!tenantId.success || !parsed.success) return failure("Revise o status e o plano.");

  const db = getDb();
  const [current] = await db.select({ status: tenants.status, plan: tenants.plan }).from(tenants).where(eq(tenants.id, tenantId.data)).limit(1);
  if (!current) return failure("Empresa não encontrada.");

  await db.update(tenants).set({ ...parsed.data, updatedAt: new Date() }).where(eq(tenants.id, tenantId.data));
  if (parsed.data.status === "suspended" || parsed.data.status === "cancelled") {
    await db.delete(sessions).where(eq(sessions.tenantId, tenantId.data));
  }
  await auditTenantAction({
    tenantId: tenantId.data,
    actorUserId: actor.id,
    action: current.status !== parsed.data.status ? "tenant.status_changed" : "tenant.plan_changed",
    entityType: "tenant",
    entityId: tenantId.data,
    metadata: {
      previousStatus: current.status,
      status: parsed.data.status,
      previousPlan: current.plan,
      plan: parsed.data.plan,
      sessionsInvalidated: parsed.data.status === "suspended" || parsed.data.status === "cancelled",
    },
  });
  paths(tenantId.data);
  return { message: "Plano e ciclo de vida atualizados.", ok: true };
}

function readLimit(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0) throw new Error("invalid_limit");
  return parsed;
}

export async function updateTenantLimits(
  tenantIdValue: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();
  const tenantId = tenantIdSchema.safeParse(tenantIdValue);
  if (!tenantId.success) return failure("Empresa inválida.");
  try {
    const storageGbRaw = String(formData.get("max_storage_gb") ?? "").trim();
    const storageGb = storageGbRaw ? Number(storageGbRaw.replace(",", ".")) : null;
    if (storageGb !== null && (!Number.isFinite(storageGb) || storageGb < 0)) throw new Error("invalid_limit");
    const customDomainRaw = String(formData.get("custom_domain") ?? "").trim();

    const limits = {
      max_users: readLimit(formData, "max_users"),
      max_properties: readLimit(formData, "max_properties"),
      max_clients: readLimit(formData, "max_clients"),
      max_opportunities: readLimit(formData, "max_opportunities"),
      max_documents: readLimit(formData, "max_documents"),
      max_storage_bytes: storageGb === null ? null : Math.round(storageGb * 1024 * 1024 * 1024),
      custom_domain: customDomainRaw === "" ? null : customDomainRaw === "1" ? 1 : 0,
    };
    const result = await getDb().update(tenants).set({ quotaOverrides: limits, updatedAt: new Date() }).where(eq(tenants.id, tenantId.data)).returning({ id: tenants.id });
    if (!result.length) return failure("Empresa não encontrada.");
    await auditTenantAction({
      tenantId: tenantId.data,
      actorUserId: actor.id,
      action: "tenant.limits_updated",
      entityType: "tenant",
      entityId: tenantId.data,
      metadata: { limits },
    });
    paths(tenantId.data);
    return { message: "Limites específicos atualizados.", ok: true };
  } catch {
    return failure("Use valores positivos ou deixe em branco para herdar o limite do plano.");
  }
}

export async function updateTenantModules(
  tenantIdValue: string,
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const actor = await requireSuperAdmin();
  const tenantId = tenantIdSchema.safeParse(tenantIdValue);
  if (!tenantId.success) return failure("Empresa inválida.");
  const enabled = modules.filter((module) => formData.get("module:" + module) === "on");
  if (!enabled.length) return failure("Mantenha ao menos um módulo habilitado.");
  if (!validModuleCombination(enabled)) return failure("A combinação selecionada não atende às dependências dos módulos.");

  const db = getDb();
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).where(eq(tenants.id, tenantId.data)).limit(1);
  if (!tenant) return failure("Empresa não encontrada.");
  for (const definition of moduleRegistry) {
    await db.insert(tenantModules).values({
      tenantId: tenantId.data,
      module: definition.key,
      enabled: enabled.includes(definition.key),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [tenantModules.tenantId, tenantModules.module],
      set: { enabled: enabled.includes(definition.key), updatedAt: new Date() },
    });
  }
  await auditTenantAction({
    tenantId: tenantId.data,
    actorUserId: actor.id,
    action: "tenant.modules_updated",
    entityType: "tenant",
    entityId: tenantId.data,
    metadata: { enabledModules: enabled },
  });
  paths(tenantId.data);
  return { message: "Módulos atualizados.", ok: true };
}

export async function accessTenant(formData: FormData) {
  const actor = await requireSuperAdmin();
  const parsed = tenantIdSchema.safeParse(formData.get("tenantId"));
  if (!parsed.success) redirect("/superadmin/empresas");

  const db = getDb();
  const [tenant] = await db.select({
    id: tenants.id,
    slug: tenants.slug,
    status: tenants.status,
  }).from(tenants).where(eq(tenants.id, parsed.data)).limit(1);
  if (!tenant || (tenant.status !== "active" && tenant.status !== "trial")) {
    redirect("/superadmin/empresas/" + parsed.data + "?access=indisponivel");
  }

  const jar = await cookies();
  const previousToken = jar.get(SESSION_COOKIE)?.value;
  if (previousToken) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(previousToken)));

  const token = issueToken();
  const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    userId: actor.id,
    tenantId: tenant.id,
    tokenHash: hashToken(token),
    expiresAt,
  });
  await auditTenantAction({
    tenantId: tenant.id,
    actorUserId: actor.id,
    action: "tenant.admin_access_started",
    entityType: "tenant",
    entityId: tenant.id,
    metadata: { expiresAt: expiresAt.toISOString() },
  });
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  jar.set(TENANT_COOKIE, tenant.slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
  redirect(tenant.slug === ROOT_TENANT_SLUG ? "/painel" : "/empresa/" + tenant.slug + "/painel");
}
