import "server-only";
import { and, eq, or } from "drizzle-orm";
import { getDb } from "@/db";
import { tenantSlugHistory, tenants } from "@/db/schema";
import { ROOT_TENANT_ID, ROOT_TENANT_SLUG, normalizeHostname, normalizeTenantSlug } from "@/lib/tenant-routing";
export { ROOT_TENANT_ID, ROOT_TENANT_SLUG, normalizeHostname, normalizeTenantSlug } from "@/lib/tenant-routing";

export type TenantRecord = typeof tenants.$inferSelect;

export function tenantOperational(status: TenantRecord["status"]) {
  return status === "active" || status === "trial";
}

export async function rootTenant() {
  const [tenant] = await getDb().select().from(tenants).where(eq(tenants.id, ROOT_TENANT_ID)).limit(1);
  return tenant ?? null;
}

export async function tenantBySlug(slug: string) {
  const normalized = normalizeTenantSlug(slug);
  if (!normalized) return null;
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, normalized)).limit(1);
  if (tenant) return { tenant, redirectSlug: null as string | null };
  const [legacy] = await db.select({ tenant }).from(tenantSlugHistory).innerJoin(tenants, eq(tenants.id, tenantSlugHistory.tenantId)).where(eq(tenantSlugHistory.slug, normalized)).limit(1);
  return legacy ? { tenant: legacy.tenant, redirectSlug: legacy.tenant.slug } : null;
}

export async function tenantByHost(rawHost: string | null) {
  const host = normalizeHostname(rawHost);
  if (!host) return null;
  const base = normalizeHostname(process.env.ROOT_DOMAIN || new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").host);
  if (host === base) return rootTenant();
  const [tenant] = await getDb().select().from(tenants).where(and(eq(tenants.domainStatus, "active"), or(eq(tenants.customDomain, host), eq(tenants.standardDomain, host)))).limit(1);
  return tenant ?? null;
}

export function tenantPublicBase(tenant: Pick<TenantRecord, "slug" | "customDomain" | "domainStatus">) {
  if (tenant.customDomain && tenant.domainStatus === "active") return `https://${tenant.customDomain}`;
  const base = (process.env.PLATFORM_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return tenant.slug === ROOT_TENANT_SLUG ? base : `${base}/empresa/${tenant.slug}`;
}
