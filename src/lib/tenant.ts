import "server-only";
import { and, eq, or } from "drizzle-orm";
import { headers } from "next/headers";
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
  const [legacy] = await db
    .select({ tenantId: tenantSlugHistory.tenantId })
    .from(tenantSlugHistory)
    .where(eq(tenantSlugHistory.slug, normalized))
    .limit(1);
  if (!legacy) return null;
  const [historicalTenant] = await db.select().from(tenants).where(eq(tenants.id, legacy.tenantId)).limit(1);
  return historicalTenant ? { tenant: historicalTenant, redirectSlug: historicalTenant.slug } : null;
}

export async function tenantByHost(rawHost: string | null) {
  const host = normalizeHostname(rawHost);
  if (!host) return null;
  const base = normalizeHostname(process.env.ROOT_DOMAIN || new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").host);
  if (host === base) return rootTenant();
  const [tenant] = await getDb()
    .select()
    .from(tenants)
    .where(and(
      eq(tenants.domainStatus, "active"),
      or(eq(tenants.customDomain, host), eq(tenants.standardDomain, host)),
    ))
    .limit(1);
  return tenant ?? null;
}

/**
 * Resolves the tenant for route handlers and server components.
 * An unknown host never falls back to the root tenant: this prevents a misconfigured
 * custom domain from exposing the platform's own inventory.
 */
export async function tenantForRequest(): Promise<TenantRecord | null> {
  const requestHeaders = await headers();
  const slug = requestHeaders.get("x-tenant-slug");
  if (slug) {
    const resolution = await tenantBySlug(slug);
    return resolution?.tenant && tenantOperational(resolution.tenant.status) ? resolution.tenant : null;
  }

  const rawHost = requestHeaders.get("host");
  const host = normalizeHostname(rawHost);
  if (!host) return null;

  const tenant = await tenantByHost(host);
  if (tenant) return tenantOperational(tenant.status) ? tenant : null;

  // Vercel branch previews are a platform surface and intentionally show the root tenant.
  const previewHost = normalizeHostname(process.env.VERCEL_URL || null);
  if (previewHost && host === previewHost) {
    const root = await rootTenant();
    return root && tenantOperational(root.status) ? root : null;
  }
  return null;
}

export function tenantPublicPathBase(tenant: Pick<TenantRecord, "slug" | "customDomain" | "domainStatus">) {
  return tenant.slug === ROOT_TENANT_SLUG || (tenant.customDomain && tenant.domainStatus === "active")
    ? ""
    : `/empresa/${tenant.slug}`;
}

export function tenantPublicBase(tenant: Pick<TenantRecord, "slug" | "customDomain" | "domainStatus">) {
  if (tenant.customDomain && tenant.domainStatus === "active") return `https://${tenant.customDomain}`;
  const base = (process.env.PLATFORM_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return tenant.slug === ROOT_TENANT_SLUG ? base : `${base}/empresa/${tenant.slug}`;
}
