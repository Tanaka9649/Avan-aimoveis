import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { clients } from "@/db/schema";
import { requireUser, type AuthenticatedUser } from "@/lib/auth";
import { canUseModule } from "@/lib/entitlements";
import { canAccess, type Module } from "@/lib/permissions";

export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.globalRole !== "super_admin") notFound();
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
export async function requireModule(module: Module) {
  const user = await requireUser();
  if (!canAccess(user, module) || !await canUseModule(user.tenantId, module)) notFound();
  return user;
}
export function clientScope(user: AuthenticatedUser) {
  const tenant = eq(clients.tenantId, user.tenantId);
  return user.role === "admin" || user.access.clients === "all" ? tenant : and(tenant, eq(clients.assignedTo, user.id));
}
