import "server-only";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals } from "@/db/schema";
import { clientScope } from "@/lib/access";
import { currentUser } from "@/lib/auth";
import { canAccess } from "@/lib/permissions";

export async function requireOpportunity(opportunityId: string) {
  const user = await currentUser();
  if (!user || !canAccess(user, "crm")) return { user: null, opportunity: undefined };
  const [opportunity] = await getDb()
    .select({ id: deals.id, clientId: deals.clientId, title: deals.title })
    .from(deals)
    .innerJoin(clients, eq(clients.id, deals.clientId))
    .where(and(eq(deals.id, opportunityId), clientScope(user)))
    .limit(1);
  return { user, opportunity };
}
