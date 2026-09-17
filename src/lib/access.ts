import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { clients } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { canAccess, type Module } from "@/lib/permissions";
export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") notFound();
  return user;
}
export async function requireModule(module: Module) {
  const user = await requireUser();
  if (!canAccess(user, module)) notFound();
  return user;
}
export function clientScope(user: Awaited<ReturnType<typeof requireUser>>) {
  return user.role === "admin" || user.access.clients === "all" ? undefined : eq(clients.assignedTo, user.id);
}
