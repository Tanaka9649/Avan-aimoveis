import { reportOperationFailure } from "@/lib/observability";
import { withApiErrors } from "@/lib/api-errors";
import { normalizeWhatsApp } from "@/lib/contact";
import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, tenantMemberships, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { modules } from "@/lib/permissions";
import { provisionTenant } from "@/lib/provisioning";

const input=z.object({
 name:z.string().trim().min(2).max(180),slug:z.string().trim().min(2).max(120),phone:z.string().max(30).optional(),whatsapp:z.string().max(30).refine(value => Boolean(normalizeWhatsApp(value)), "Informe um WhatsApp válido.").transform(value => normalizeWhatsApp(value)!),email:z.union([z.email(),z.literal("")]).optional(),
 plan:z.enum(["starter","pro","max","custom"]),modules:z.array(z.enum(modules)).min(1),
 branding:z.object({logoLight:z.union([z.literal(""),z.url().max(2000)]).optional(),logoDark:z.union([z.literal(""),z.url().max(2000)]).optional(),favicon:z.union([z.literal(""),z.url().max(2000)]).optional(),logos:z.array(z.object({id:z.string().min(1).max(120),name:z.string().max(80).optional(),logoLight:z.union([z.literal(""),z.url().max(2000)]).optional(),logoDark:z.union([z.literal(""),z.url().max(2000)]).optional()})).max(8).optional()}).optional(),
 site:z.object({primaryColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),secondaryColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),accentColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),title:z.string().max(180).optional(),description:z.string().max(300).optional()}).optional(),
 admin:z.object({name:z.string().trim().min(2).max(160),email:z.email()})
});
async function handleGET(){const user=await requireSuperAdmin();void user;const db=getDb();const rows=await db.select({id:tenants.id,name:tenants.name,slug:tenants.slug,status:tenants.status,plan:tenants.plan,domain:tenants.customDomain,users:sql<number>`count(distinct ${tenantMemberships.id})`,properties:sql<number>`count(distinct ${properties.id})`}).from(tenants).leftJoin(tenantMemberships,eq(tenantMemberships.tenantId,tenants.id)).leftJoin(properties,eq(properties.tenantId,tenants.id)).groupBy(tenants.id);return NextResponse.json({tenants:rows})}
async function handlePOST(request:Request){const user=await requireSuperAdmin();try{const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Revise os dados da empresa.",issues:parsed.error.flatten().fieldErrors},{status:400});const created=await provisionTenant(parsed.data,user.id);return NextResponse.json(created,{status:201})}catch(error){const allowed=["Slug inválido.","A combinação de módulos possui dependências ausentes.","Os módulos selecionados não estão disponíveis neste plano.","Este slug já está em uso.","Configure e salve os limites deste plano no Super Admin antes de criar uma empresa."];const message=error instanceof Error&&allowed.includes(error.message)?error.message:null;if(!message)reportOperationFailure("provisioning","tenant_creation_failed");return NextResponse.json({error:message||"Não foi possível criar a empresa. Atualize e tente novamente."},{status:message?409:503})}}

export const GET = withApiErrors(handleGET);
export const POST = withApiErrors(handlePOST);
