import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, tenantMemberships, tenants, users } from "@/db/schema";
import type { Access } from "@/lib/permissions";
import { hashToken } from "./security";

export const SESSION_COOKIE = "avan_session";
export type AuthenticatedUser = {
  id: string; name: string; email: string; role: "admin" | "equipe";
  globalRole: "user" | "super_admin"; access: Access; tenantId: string;
  membershipRole: "owner" | "admin" | "manager" | "agent" | "viewer";
  tenant: { id: string; name: string; slug: string; status: "trial" | "active" };
};

export async function currentUser(): Promise<AuthenticatedUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const db = getDb();
  const [row] = await db.select({
    id: users.id, name: users.name, email: users.email, globalRole: users.globalRole,
    tenantId: sessions.tenantId, membershipRole: tenantMemberships.role, access: tenantMemberships.permissions,
    tenantName: tenants.name, tenantSlug: tenants.slug, tenantStatus: tenants.status,
  }).from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .innerJoin(tenantMemberships, and(eq(tenantMemberships.userId, users.id), eq(tenantMemberships.tenantId, sessions.tenantId)))
    .innerJoin(tenants, eq(tenants.id, sessions.tenantId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date()), eq(users.active, true), eq(tenantMemberships.status, "active"), inArray(tenants.status, ["active", "trial"])))
    .limit(1);
  if (!row || !row.tenantId || (row.tenantStatus !== "active" && row.tenantStatus !== "trial")) return null;
  const requestedSlug = (await headers()).get("x-tenant-slug");
  if (requestedSlug && requestedSlug !== row.tenantSlug) return null;
  const admin = row.membershipRole === "owner" || row.membershipRole === "admin";
  return { id: row.id, name: row.name, email: row.email, globalRole: row.globalRole, tenantId: row.tenantId, membershipRole: row.membershipRole, role: admin ? "admin" : "equipe", access: row.access, tenant: { id: row.tenantId, name: row.tenantName, slug: row.tenantSlug, status: row.tenantStatus } };
}
export async function requireUser() {
  const user = await currentUser();
  if (!user) {
    const slug = (await headers()).get("x-tenant-slug");
    redirect(slug ? `/empresa/${slug}/painel/login` : "/login");
  }
  return user;
}
