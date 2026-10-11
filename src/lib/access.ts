import { headers } from "next/headers";
import { ApiAccessError } from "@/lib/api-errors";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { clients } from "@/db/schema";
import { requireUser, type AuthenticatedUser } from "@/lib/auth";
import { canUseModule } from "@/lib/entitlements";
import { canAccess, canWrite, type Module } from "@/lib/permissions";

async function denyAccess(): Promise<never> {
  if ((await headers()).get("x-platform-api") === "1") throw new ApiAccessError(403);
  notFound();
}
export async function requireSuperAdmin() {
  const user = await requireUser();
  if (user.globalRole !== "super_admin") await denyAccess();
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") await denyAccess();
  return user;
}
export async function requireModule(module: Module) {
  const user = await requireUser();
  if (!canAccess(user, module) || !await canUseModule(user.tenantId, module)) await denyAccess();
  return user;
}
export async function requireWriteModule(module: Module) {
  const user = await requireModule(module);
  if (!canWrite(user)) await denyAccess();
  return user;
}
export function clientScope(user: AuthenticatedUser) {
  const tenant = eq(clients.tenantId, user.tenantId);
  return user.role === "admin" || user.access.clients === "all" ? tenant : and(tenant, eq(clients.assignedTo, user.id));
}
