import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb } from "@/db";
import { clients, deals, properties, proposals, sales, stages } from "@/db/schema";
import { clientScope } from "./access";
import type { AuthenticatedUser } from "./auth";

/** Shared by the page and authorization regression tests. */
export async function commercialRows(user: AuthenticatedUser) {
const db=getDb();return await Promise.all([
 db.select({id:proposals.id,client:clients.name,deal:deals.title,property:properties.title,advertised:proposals.advertisedAmountCents,amount:proposals.amountCents,counter:proposals.counterAmountCents,status:proposals.status,validUntil:proposals.validUntil,createdAt:proposals.createdAt}).from(proposals).innerJoin(deals,and(eq(deals.id,proposals.dealId),eq(deals.tenantId,proposals.tenantId))).innerJoin(clients,and(eq(clients.id,deals.clientId),eq(clients.tenantId,deals.tenantId))).leftJoin(properties,and(eq(properties.id,proposals.propertyId),eq(properties.tenantId,proposals.tenantId))).where(and(eq(proposals.tenantId,user.tenantId),clientScope(user))).orderBy(desc(proposals.createdAt)).limit(100),
 db.select({id:sales.id,client:clients.name,property:properties.title,advertised:sales.advertisedAmountCents,amount:sales.amountCents,commission:sales.commissionCents,soldAt:sales.soldAt}).from(sales).innerJoin(deals,and(eq(deals.id,sales.dealId),eq(deals.tenantId,sales.tenantId))).innerJoin(clients,and(eq(clients.id,deals.clientId),eq(clients.tenantId,deals.tenantId))).innerJoin(properties,and(eq(properties.id,sales.propertyId),eq(properties.tenantId,sales.tenantId))).where(and(eq(sales.tenantId,user.tenantId),clientScope(user))).orderBy(desc(sales.soldAt)).limit(100),
 db.select({id:deals.id,title:deals.title,client:clients.name}).from(deals).innerJoin(clients,and(eq(clients.id,deals.clientId),eq(clients.tenantId,deals.tenantId))).innerJoin(stages,and(eq(stages.id,deals.stageId),eq(stages.tenantId,deals.tenantId))).where(and(eq(deals.tenantId,user.tenantId),clientScope(user),eq(stages.isLost,false),eq(stages.isWon,false))).orderBy(asc(clients.name)),
 db.select({id:properties.id,title:properties.title,code:properties.code,price:properties.priceCents}).from(properties).where(and(eq(properties.tenantId,user.tenantId),ne(properties.status,"vendido"))).orderBy(asc(properties.title))
 ] as const);
}
