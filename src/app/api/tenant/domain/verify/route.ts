import { withApiErrors } from "@/lib/api-errors";
import { NextResponse } from "next/server";
import { and,eq,sql } from "drizzle-orm";
import { getDb } from "@/db";
import { tenants } from "@/db/schema";
import { requireAdmin } from "@/lib/access";
import { getLimit } from "@/lib/entitlements";
import { domainIntegrationConfigured,verifyProjectDomain,removeProjectDomain } from "@/lib/vercel-domain";
import { reportOperationFailure } from "@/lib/observability";
const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"no-store"}});
export const POST=withApiErrors(async()=>{
  const admin=await requireAdmin(),db=getDb();
  const [tenant]=await db.select({domain:tenants.customDomain}).from(tenants).where(eq(tenants.id,admin.tenantId));
  if(!tenant?.domain)return json({error:"Salve um domínio antes de verificar."},400);
  if(!await getLimit(admin.tenantId,"custom_domain"))return json({error:"Seu plano não permite domínio próprio."},403);
  if(!domainIntegrationConfigured())return json({error:"Configure VERCEL_API_TOKEN, VERCEL_PROJECT_ID (ou NAME) e VERCEL_TEAM_ID no ambiente."},503);
  try {
    const evidence=await verifyProjectDomain(tenant.domain);
    const status=evidence.active?"active":"verifying";
    const result=await db.execute(sql`WITH changed AS (
      UPDATE tenants SET domain_status=${status}::domain_status,updated_at=now()
      WHERE id=${admin.tenantId}::uuid AND custom_domain=${tenant.domain} RETURNING id
    ) INSERT INTO tenant_audit_logs(tenant_id,actor_user_id,action,entity_type,entity_id,metadata)
      SELECT id,${admin.id}::uuid,'domain_verification_checked','tenant_domain',${tenant.domain},${JSON.stringify({status})}::jsonb FROM changed RETURNING id`);
    if(!result.rows.length)return json({error:"O domínio mudou durante a verificação. Atualize a página."},409);
    return json({status,verification:evidence.verification,dns:evidence.dns});
  } catch {
    reportOperationFailure("domain","verification_failed");
    await db.update(tenants).set({domainStatus:"error",updatedAt:new Date()}).where(and(eq(tenants.id,admin.tenantId),eq(tenants.customDomain,tenant.domain)));
    return json({error:"Não foi possível verificar domínio e DNS na Vercel. Confira o vínculo com o projeto e as credenciais."},502);
  }
});
export const DELETE=withApiErrors(async()=>{
  const admin=await requireAdmin(),db=getDb();
  const [tenant]=await db.select({domain:tenants.customDomain}).from(tenants).where(eq(tenants.id,admin.tenantId));
  if(!tenant?.domain)return json({ok:true});
  if(!domainIntegrationConfigured())return json({error:"A integração Vercel é necessária para remover o domínio com segurança."},503);
  try{
    await removeProjectDomain(tenant.domain);
    const result=await db.execute(sql`WITH removed AS (
      UPDATE tenants SET custom_domain=NULL,domain_status='pending',updated_at=now()
      WHERE id=${admin.tenantId}::uuid AND custom_domain=${tenant.domain} RETURNING id
    ) INSERT INTO tenant_audit_logs(tenant_id,actor_user_id,action,entity_type,entity_id)
      SELECT id,${admin.id}::uuid,'domain_removed','tenant_domain',${tenant.domain} FROM removed RETURNING id`);
    return result.rows.length?json({ok:true}):json({error:"O domínio mudou. Atualize a página."},409);
  }catch{reportOperationFailure("domain","removal_failed");return json({error:"Não foi possível remover o domínio agora."},502);}
});
