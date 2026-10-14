import "server-only";
import { platformBaseUrl } from "@/lib/platform-url";
import { sendEmail } from "@/lib/email";
import { isPlanConfigured } from "@/lib/plan-configuration";
import { normalizeWhatsApp } from "@/lib/contact";
import { randomUUID } from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { plans, tenantAuditLogs, tenantInvites, tenantModules, tenantProvisioning, tenants } from "@/db/schema";
import { defaultAccess, type Module } from "@/lib/permissions";
import { moduleRegistry, validModuleCombination } from "@/lib/module-registry";
import { hashToken, issueToken } from "@/lib/security";
import { normalizeTenantSlug } from "@/lib/tenant-routing";
import type { TenantBranding } from "@/lib/branding";
import { tenantDefaultQueries } from "@/lib/tenant-defaults";

export type ProvisionTenantInput = {
  name: string; slug: string; phone?: string; whatsapp?: string; email?: string;
  plan: "starter" | "pro" | "max" | "custom"; modules: Module[];
  branding?: TenantBranding;
  site?: { primaryColor?: string; secondaryColor?: string; accentColor?: string; title?: string; description?: string };
  admin: { name: string; email: string };
};

export async function provisionTenant(input: ProvisionTenantInput, actorUserId: string) {
  const slug=normalizeTenantSlug(input.slug); if(!slug) throw new Error("Slug inválido.");
  const selectedModules=[...new Set(input.modules)];
  if(!validModuleCombination(selectedModules)) throw new Error("A combinação de módulos possui dependências ausentes.");
  const db=getDb();
  const standardBase=platformBaseUrl();
  const adminEmail=input.admin.email.toLowerCase();
  const [plan]=await db.select({active:plans.active,modules:plans.modules,limits:plans.limits}).from(plans).where(eq(plans.code,input.plan)).limit(1);
  if(!plan?.active||selectedModules.some((module)=>!plan.modules.includes(module)))throw new Error("Os módulos selecionados não estão disponíveis neste plano.");
  const [existing]=await db.select({id:tenants.id,name:tenants.name,plan:tenants.plan,status:tenants.status}).from(tenants).where(eq(tenants.slug,slug)).limit(1);
  if(existing){
    const [invite]=await db.select({id:tenantInvites.id}).from(tenantInvites).where(and(eq(tenantInvites.tenantId,existing.id),eq(tenantInvites.email,adminEmail),isNull(tenantInvites.acceptedAt))).limit(1);
    const configuredModules=(await db.select({module:tenantModules.module}).from(tenantModules).where(and(eq(tenantModules.tenantId,existing.id),eq(tenantModules.enabled,true)))).map(({module})=>module).sort();
    const sameRequest=existing.status==="configuring"&&existing.name===input.name.trim()&&existing.plan===input.plan&&invite&&configuredModules.join(",")===[...selectedModules].sort().join(",");
    if(!sameRequest)throw new Error("Este slug já está em uso.");
    const token=issueToken(), now=new Date();
    await db.batch([
      ...tenantDefaultQueries(db, existing.id),
      db.update(tenantInvites).set({tokenHash:hashToken(token),expiresAt:new Date(now.getTime()+7*86400000)}).where(eq(tenantInvites.id,invite.id)),
      db.update(tenantProvisioning).set({attempts:sql`${tenantProvisioning.attempts}+1`,updatedAt:now}).where(and(eq(tenantProvisioning.tenantId,existing.id),eq(tenantProvisioning.step,"admin_invite"))),
      db.insert(tenantAuditLogs).values({tenantId:existing.id,actorUserId,action:"tenant_provisioning_retried",entityType:"tenant",entityId:existing.id,metadata:{slug}}),
    ]);
    const emailSent=await sendEmail({to:adminEmail,subject:"Ative sua empresa",text:`Abra ${standardBase}/convite/${token} para ativar sua empresa. Este novo link substitui o convite anterior e expira em 7 dias.`,key:`provision/${invite.id}/${hashToken(token).slice(0,16)}`});
    return {tenantId:existing.id,slug,status:"configuring" as const,inviteUrl:`${standardBase}/convite/${token}`,emailSent,pending:["admin_invite"]};
  }
  if(!isPlanConfigured(plan.limits)) throw new Error("Configure e salve os limites deste plano no Super Admin antes de criar uma empresa.");
  const tenantId=randomUUID(), inviteId=randomUUID(), token=issueToken();
  const steps=["tenant","branding","plan","modules","admin_invite","site"] as const;
  await db.batch([
    db.insert(tenants).values({id:tenantId,name:input.name.trim(),slug,status:"configuring",plan:input.plan,phone:input.phone||null,whatsapp:input.whatsapp ? normalizeWhatsApp(input.whatsapp) : null,email:input.email?.toLowerCase()||null,branding:input.branding||{},site:input.site||{},standardDomain:`${standardBase}/empresa/${slug}`}),
    ...tenantDefaultQueries(db, tenantId),
    ...selectedModules.map((module)=>db.insert(tenantModules).values({tenantId,module,enabled:true})),
    db.insert(tenantInvites).values({id:inviteId,tenantId,name:input.admin.name.trim(),email:adminEmail,role:"owner",permissions:defaultAccess,tokenHash:hashToken(token),expiresAt:new Date(Date.now()+7*86400000),invitedBy:actorUserId}),
    ...steps.map((step)=>db.insert(tenantProvisioning).values({tenantId,step,status:step==="admin_invite"?"pending":"complete",attempts:1})),
    db.insert(tenantAuditLogs).values({tenantId,actorUserId,action:"tenant_created",entityType:"tenant",entityId:tenantId,metadata:{slug,plan:input.plan,modules:selectedModules}}),
  ]);
  const emailSent=await sendEmail({ to: adminEmail, subject: "Ative sua empresa", text: `Sua empresa foi criada. Abra ${standardBase}/convite/${token} para definir sua senha e ativar o acesso. O link expira em 7 dias.`, key: `provision/${inviteId}` });
  return {tenantId,slug,status:"configuring" as const,inviteUrl:`${standardBase}/convite/${token}`,emailSent,pending:["admin_invite"]};
}

export const availableModules = moduleRegistry;
