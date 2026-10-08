import "server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tenantAuditLogs, tenantInvites, tenantModules, tenantProvisioning, tenants } from "@/db/schema";
import { defaultAccess, type Module } from "@/lib/permissions";
import { moduleRegistry, validModuleCombination } from "@/lib/module-registry";
import { hashToken, issueToken } from "@/lib/security";
import { normalizeTenantSlug } from "@/lib/tenant-routing";

export type ProvisionTenantInput = {
  name: string; slug: string; phone?: string; whatsapp?: string; email?: string;
  plan: "starter" | "pro" | "max" | "custom"; modules: Module[];
  branding?: { logoLight?: string; logoDark?: string; favicon?: string };
  site?: { primaryColor?: string; secondaryColor?: string; accentColor?: string; title?: string; description?: string };
  admin: { name: string; email: string };
};

export async function provisionTenant(input: ProvisionTenantInput, actorUserId: string) {
  const slug=normalizeTenantSlug(input.slug); if(!slug) throw new Error("Slug inválido.");
  if(!validModuleCombination(input.modules)) throw new Error("A combinação de módulos possui dependências ausentes.");
  const db=getDb();
  const [existing]=await db.select({id:tenants.id}).from(tenants).where(eq(tenants.slug,slug)).limit(1);
  if(existing) throw new Error("Este slug já está em uso.");
  const tenantId=randomUUID(), inviteId=randomUUID(), token=issueToken();
  const standardBase=(process.env.PLATFORM_BASE_URL||process.env.NEXT_PUBLIC_SITE_URL||"http://localhost:3000").replace(/\/$/,"");
  const steps=["tenant","branding","plan","modules","admin_invite","site"] as const;
  await db.batch([
    db.insert(tenants).values({id:tenantId,name:input.name.trim(),slug,status:"configuring",plan:input.plan,phone:input.phone||null,whatsapp:input.whatsapp||null,email:input.email?.toLowerCase()||null,branding:input.branding||{},site:input.site||{},standardDomain:`${standardBase}/empresa/${slug}`}),
    ...input.modules.map((module)=>db.insert(tenantModules).values({tenantId,module,enabled:true})),
    db.insert(tenantInvites).values({id:inviteId,tenantId,name:input.admin.name.trim(),email:input.admin.email.toLowerCase(),role:"owner",permissions:defaultAccess,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+7*86400000),invitedBy:actorUserId}),
    ...steps.map((step)=>db.insert(tenantProvisioning).values({tenantId,step,status:step==="admin_invite"?"pending":"complete",attempts:1})),
    db.insert(tenantAuditLogs).values({tenantId,actorUserId,action:"tenant_created",entityType:"tenant",entityId:tenantId,metadata:{slug,plan:input.plan,modules:input.modules}}),
  ]);
  return {tenantId,slug,status:"configuring" as const,inviteUrl:`${standardBase}/convite/${token}`,pending:["admin_invite"]};
}

export const availableModules = moduleRegistry;
