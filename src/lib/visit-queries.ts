import "server-only";
import { and, asc, desc, eq, gte, lt, ne, or } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals, properties, visits } from "@/db/schema";
import { clientScope } from "@/lib/access";
import type { AuthenticatedUser } from "@/lib/auth";

export const VISIT_PAGE_SIZE = 25;
export function visitPageNumber(value: string | string[] | undefined) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 1 ? Math.min(parsed, 100_000) : 1;
}
export async function visitRows(user: AuthenticatedUser, page: number, view: string, now = new Date()) {
  const timeFilter = view === "all" ? undefined : view === "history"
    ? or(lt(visits.scheduledAt, now), ne(visits.status, "agendada"))
    : and(gte(visits.scheduledAt, now), eq(visits.status, "agendada"));
  return getDb().select({
    id: visits.id, scheduledAt: visits.scheduledAt, status: visits.status,
    notes: visits.notes, feedback: visits.feedback, client: clients.name,
    property: properties.title, code: properties.code,
  }).from(visits)
    .innerJoin(clients, and(eq(clients.id, visits.clientId), eq(clients.tenantId, visits.tenantId)))
    .innerJoin(properties, and(eq(properties.id, visits.propertyId), eq(properties.tenantId, visits.tenantId)))
    .where(and(eq(visits.tenantId, user.tenantId), clientScope(user), timeFilter))
    .orderBy(view === "history" ? desc(visits.scheduledAt) : asc(visits.scheduledAt), asc(visits.id))
    .limit(VISIT_PAGE_SIZE + 1).offset((page - 1) * VISIT_PAGE_SIZE);
}
export async function visitChoices(user: AuthenticatedUser) {
  const db = getDb();
  return Promise.all([
    db.select({ id: clients.id, name: clients.name }).from(clients).where(clientScope(user)).orderBy(asc(clients.name)),
    db.select({ id: properties.id, title: properties.title, code: properties.code }).from(properties).where(eq(properties.tenantId, user.tenantId)).orderBy(asc(properties.title)),
    db.select({ id: deals.id, title: deals.title, clientId: deals.clientId }).from(deals)
      .innerJoin(clients, and(eq(clients.id, deals.clientId), eq(clients.tenantId, deals.tenantId)))
      .where(and(eq(deals.tenantId, user.tenantId), clientScope(user))).orderBy(asc(deals.title)),
  ]);
}
