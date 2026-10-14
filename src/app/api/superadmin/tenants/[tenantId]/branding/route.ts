import { and, eq, isNotNull } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { brandingAssets, tenants, activityLogs } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { withApiErrors } from "@/lib/api-errors";
const url = z.string().max(2000).refine(value => !value || /^https?:\/\//.test(value) || /^\/api\/branding\//.test(value));
const input = z.object({ logos: z.array(z.object({id:z.string().min(1).max(120),name:z.string().max(80).optional(),logoLight:url.optional(),logoDark:url.optional()})).max(8) });
export const PUT = withApiErrors(async (request: Request) => {
  const actor = await requireSuperAdmin();
  const tenantId = request.url.split("/tenants/")[1]?.split("/")[0];
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!z.uuid().safeParse(tenantId).success || !parsed.success) return NextResponse.json({error:"Identidade inválida."},{status:400});
  const db = getDb();
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id,tenantId)).limit(1);
  if (!tenant) return NextResponse.json({error:"Empresa não encontrada."},{status:404});
  for (const logo of parsed.data.logos) for (const value of [logo.logoLight,logo.logoDark]) {
    if (!value?.startsWith("/api/branding/")) continue;
    const [scope,asset] = value.slice("/api/branding/".length).split("/");
    if(scope!==tenantId) return NextResponse.json({error:"Imagem pertence a outra empresa."},{status:400});
    const [confirmed] = await db.select({id:brandingAssets.id}).from(brandingAssets).where(and(eq(brandingAssets.tenantId,tenantId),eq(brandingAssets.asset,asset),isNotNull(brandingAssets.confirmedAt))).limit(1);
    if(!confirmed) return NextResponse.json({error:"Confirme o envio da imagem."},{status:400});
  }
  const logos=parsed.data.logos;
  await db.batch([
    db.update(tenants).set({branding:{...tenant.branding,logos,logoLight:logos[0]?.logoLight,logoDark:logos[0]?.logoDark},updatedAt:new Date()}).where(eq(tenants.id,tenantId)),
    db.insert(activityLogs).values({tenantId,userId:actor.id,entityType:"tenant",entityId:tenantId,action:"branding_updated"})
  ]);
  return NextResponse.json({ok:true});
});
