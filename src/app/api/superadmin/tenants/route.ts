import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, tenantMemberships, tenants } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { modules } from "@/lib/permissions";
import { provisionTenant } from "@/lib/provisioning";

const input=z.object({
 name:z.string().trim().min(2).max(180),slug:z.string().trim().min(2).max(120),phone:z.string().max(30).optional(),whatsapp:z.string().max(30).optional(),email:z.union([z.email(),z.literal("")]).optional(),
 plan:z.enum(["starter","pro","max","custom"]),modules:z.array(z.enum(modules)).min(1),
 branding:z.object({logoLight:z.union([z.literal(""),z.url().max(2000)]).optional(),logoDark:z.union([z.literal(""),z.url().max(2000)]).optional(),favicon:z.union([z.literal(""),z.url().max(2000)]).optional(),logos:z.array(z.object({id:z.string().min(1).max(120),name:z.string().max(80).optional(),logoLight:z.union([z.literal(""),z.url().max(2000)]).optional(),logoDark:z.union([z.literal(""),z.url().max(2000)]).optional()})).max(8).optional()}).optional(),
 site:z.object({primaryColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),secondaryColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),accentColor:z.string().regex(/^#[0-9a-f]{6}$/i).optional(),title:z.string().max(180).optional(),description:z.string().max(300).optional()}).optional(),
 admin:z.object({name:z.string().trim().min(2).max(160),email:z.email()})
});
export async function GET(){const user=await requireSuperAdmin();void user;const db=getDb();const rows=await db.select({id:tenants.id,name:tenants.name,slug:tenants.slug,status:tenants.status,plan:tenants.plan,domain:tenants.customDomain,users:sql<number>`count(distinct ${tenantMemberships.id})`,properties:sql<number>`count(distinct ${properties.id})`}).from(tenants).leftJoin(tenantMemberships,eq(tenantMemberships.tenantId,tenants.id)).leftJoin(properties,eq(properties.tenantId,tenants.id)).groupBy(tenants.id);return NextResponse.json({tenants:rows})}
export async function POST(request:Request){const user=await requireSuperAdmin();try{const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Revise os dados da empresa.",issues:parsed.error.flatten().fieldErrors},{status:400});const created=await provisionTenant(parsed.data,user.id);return NextResponse.json(created,{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"Não foi possível criar a empresa."},{status:409})}}
