import "server-only";
import { and, count, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, plans, properties, tenantMemberships, tenantModules, tenants } from "@/db/schema";
import type { Module } from "@/lib/permissions";

export type LimitKey = "max_users" | "max_properties" | "max_clients" | "max_storage_bytes" | "custom_domain";
const unlimited = (value: unknown): number | null => typeof value === "number" && Number.isFinite(value) ? value : null;

export async function tenantEntitlements(tenantId: string) {
  const [row] = await getDb().select({ plan: tenants.plan, overrides: tenants.quotaOverrides, limits: plans.limits, modules: plans.modules }).from(tenants).leftJoin(plans, eq(plans.code, tenants.plan)).where(eq(tenants.id, tenantId)).limit(1);
  if (!row) return null;
  return { plan: row.plan, limits: { ...(row.limits || {}), ...(row.overrides || {}) }, modules: row.modules || [] };
}

export async function getLimit(tenantId: string, key: LimitKey) {
  const entitlements = await tenantEntitlements(tenantId);
  return entitlements ? unlimited(entitlements.limits[key]) : 0;
}

export async function canUseModule(tenantId: string, module: Module) {
  const entitlements = await tenantEntitlements(tenantId);
  if (!entitlements || !entitlements.modules.includes(module)) return false;
  const [setting] = await getDb().select({ enabled: tenantModules.enabled }).from(tenantModules).where(and(eq(tenantModules.tenantId, tenantId), eq(tenantModules.module, module))).limit(1);
  return setting?.enabled === true;
}

export async function getUsage(tenantId: string, key: LimitKey) {
  const db = getDb();
  if (key === "max_users") return Number((await db.select({ value: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active"))))[0].value);
  if (key === "max_properties") return Number((await db.select({ value: count() }).from(properties).where(eq(properties.tenantId, tenantId)))[0].value);
  if (key === "max_clients") return Number((await db.select({ value: count() }).from(clients).where(eq(clients.tenantId, tenantId)))[0].value);
  return 0;
}

export async function canCreateResource(tenantId: string, key: LimitKey) {
  const limit = await getLimit(tenantId, key);
  if (limit === null) return true;
  return (await getUsage(tenantId, key)) < limit;
}
