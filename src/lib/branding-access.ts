import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { requireAdmin, requireSuperAdmin } from "./access";
import { ApiAccessError } from "./api-errors";

export async function brandingActor(request: Request) {
  const target = new URL(request.url).searchParams.get("tenantId");
  if (!target) return requireAdmin();
  const actor = await requireSuperAdmin();
  if (!z.uuid().safeParse(target).success) throw new ApiAccessError(403);
  const [tenant] = await getDb().select({ id: tenants.id }).from(tenants).where(eq(tenants.id, target)).limit(1);
  if (!tenant) throw new ApiAccessError(403);
  return { ...actor, tenantId: tenant.id };
}
