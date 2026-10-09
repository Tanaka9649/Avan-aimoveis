import "server-only";
import { and, count, eq, gt, isNull, sum } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals, opportunityAttachments, plans, properties, propertyDocuments, propertyPhotos, tenantInvites, tenantMemberships, tenantModules, tenants } from "@/db/schema";
import type { Module } from "@/lib/permissions";

export type LimitKey = "max_users" | "max_properties" | "max_clients" | "max_opportunities" | "max_documents" | "max_storage_bytes" | "custom_domain";
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
  if (key === "max_users") {
    const [memberships, invitations] = await Promise.all([
      db.select({ value: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active"))),
      db.select({ value: count() }).from(tenantInvites).where(and(eq(tenantInvites.tenantId, tenantId), isNull(tenantInvites.acceptedAt), gt(tenantInvites.expiresAt, new Date()))),
    ]);
    return Number(memberships[0].value) + Number(invitations[0].value);
  }
  if (key === "max_properties") return Number((await db.select({ value: count() }).from(properties).where(eq(properties.tenantId, tenantId)))[0].value);
  if (key === "max_clients") return Number((await db.select({ value: count() }).from(clients).where(eq(clients.tenantId, tenantId)))[0].value);
  if (key === "max_opportunities") return Number((await db.select({ value: count() }).from(deals).where(eq(deals.tenantId, tenantId)))[0].value);
  if (key === "max_documents") {
    const [propertyRows, opportunityRows] = await Promise.all([
      db.select({ value: count() }).from(propertyDocuments).where(eq(propertyDocuments.tenantId, tenantId)),
      db.select({ value: count() }).from(opportunityAttachments).where(eq(opportunityAttachments.tenantId, tenantId)),
    ]);
    return Number(propertyRows[0].value) + Number(opportunityRows[0].value);
  }
  if (key === "max_storage_bytes") {
    const [photos, documents, attachments] = await Promise.all([
      db.select({ value: sum(propertyPhotos.sizeBytes) }).from(propertyPhotos).where(eq(propertyPhotos.tenantId, tenantId)),
      db.select({ value: sum(propertyDocuments.size) }).from(propertyDocuments).where(eq(propertyDocuments.tenantId, tenantId)),
      db.select({ value: sum(opportunityAttachments.sizeBytes) }).from(opportunityAttachments).where(eq(opportunityAttachments.tenantId, tenantId)),
    ]);
    return Number(photos[0].value || 0) + Number(documents[0].value || 0) + Number(attachments[0].value || 0);
  }
  return 0;
}

export async function canActivateMembership(tenantId: string) {
  const limit = await getLimit(tenantId, "max_users");
  if (limit === null) return true;
  const [usage] = await getDb().select({ value: count() }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, tenantId), eq(tenantMemberships.status, "active")));
  return Number(usage.value) < limit;
}

export async function canCreateResource(tenantId: string, key: LimitKey) {
  return canConsumeResource(tenantId, key, 1);
}

export async function canConsumeResource(tenantId: string, key: LimitKey, amount: number) {
  const limit = await getLimit(tenantId, key);
  if (limit === null) return true;
  return (await getUsage(tenantId, key)) + amount <= limit;
}
