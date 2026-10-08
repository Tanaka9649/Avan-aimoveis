import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { tenantAuditLogs, tenantInvites, tenantMemberships, tenantProvisioning, tenants, users } from "@/db/schema";
import { canCreateResource } from "@/lib/entitlements";
import { hashPassword, hashToken } from "@/lib/security";

export async function acceptInvitation(token: string, password: string) {
  const db=getDb(); const now=new Date();
  const [invite]=await db.select().from(tenantInvites).where(and(eq(tenantInvites.tokenHash,hashToken(token)),isNull(tenantInvites.acceptedAt),gt(tenantInvites.expiresAt,now))).limit(1);
  if(!invite) return {ok:false as const,error:"Convite inválido ou expirado."};
  const [tenant]=await db.select({id:tenants.id,slug:tenants.slug,status:tenants.status}).from(tenants).where(eq(tenants.id,invite.tenantId)).limit(1);
  if(!tenant||tenant.status==="suspended"||tenant.status==="cancelled") return {ok:false as const,error:"A empresa não está disponível."};
  if(!await canCreateResource(invite.tenantId,"max_users")) return {ok:false as const,error:"O limite de usuários da empresa foi atingido."};
  const [existing]=await db.select().from(users).where(eq(users.email,invite.email)).limit(1);
  const userId=existing?.id||randomUUID();
  const queries=[];
  if(!existing) queries.push(db.insert(users).values({id:userId,name:invite.name,email:invite.email,passwordHash:await hashPassword(password),role:"equipe",active:true}));
  queries.push(
    db.insert(tenantMemberships).values({tenantId:invite.tenantId,userId,role:invite.role,status:"active",permissions:invite.permissions,invitedAt:invite.createdAt,activatedAt:now}).onConflictDoUpdate({target:[tenantMemberships.tenantId,tenantMemberships.userId],set:{status:"active",role:invite.role,permissions:invite.permissions,activatedAt:now}}),
    db.update(tenantInvites).set({acceptedAt:now}).where(and(eq(tenantInvites.id,invite.id),isNull(tenantInvites.acceptedAt))),
    db.update(tenantProvisioning).set({status:"complete",lastError:null,updatedAt:now}).where(and(eq(tenantProvisioning.tenantId,invite.tenantId),eq(tenantProvisioning.step,"admin_invite"))),
    db.update(tenants).set({status:"trial",updatedAt:now}).where(eq(tenants.id,invite.tenantId)),
    db.insert(tenantAuditLogs).values({tenantId:invite.tenantId,actorUserId:userId,action:"invite_accepted",entityType:"user",entityId:userId})
  );
  await db.batch(queries);
  return {ok:true as const,tenantSlug:tenant.slug};
}
