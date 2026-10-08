import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions, tenantMemberships, tenants, users } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashToken, issueToken, verifyPassword } from "@/lib/security";
import { SESSION_COOKIE, TENANT_COOKIE } from "@/lib/auth";
import { firstAllowedRoute } from "@/lib/permissions";
import { ROOT_TENANT_SLUG, normalizeTenantSlug } from "@/lib/tenant";

const input=z.object({email:z.email(),password:z.string().min(8).max(200),tenantSlug:z.string().max(120).optional()});
export async function POST(request:Request){
  const invalid=()=>NextResponse.json({error:"E-mail ou senha inválidos."},{status:401});
  try{
    const parsed=input.safeParse(await request.json()); if(!parsed.success)return invalid();
    const ip=(await headers()).get("x-forwarded-for")?.split(",")[0]||"unknown";
    if(!await checkRateLimit(`login:${ip}`,8,15*60*1000))return NextResponse.json({error:"Aguarde alguns minutos antes de tentar novamente."},{status:429});
    const slug=normalizeTenantSlug(parsed.data.tenantSlug||ROOT_TENANT_SLUG);
    const db=getDb();
    const [row]=await db.select({user:users,membership:tenantMemberships,tenant:tenants})
      .from(users)
      .innerJoin(tenantMemberships,eq(tenantMemberships.userId,users.id))
      .innerJoin(tenants,eq(tenants.id,tenantMemberships.tenantId))
      .where(and(eq(users.email,parsed.data.email.toLowerCase()),eq(tenants.slug,slug),eq(users.active,true),eq(tenantMemberships.status,"active"),inArray(tenants.status,["active","trial"]))).limit(1);
    if(!row||!await verifyPassword(parsed.data.password,row.user.passwordHash))return invalid();
    const token=issueToken(); const expiresAt=new Date(Date.now()+7*24*60*60*1000);
    await db.insert(sessions).values({userId:row.user.id,tenantId:row.tenant.id,tokenHash:hashToken(token),expiresAt});
    const role=row.membership.role==="owner"||row.membership.role==="admin"?"admin":"equipe";
    const base=firstAllowedRoute({role,access:row.membership.permissions});
    const redirectTo=slug===ROOT_TENANT_SLUG?base:`/empresa/${slug}${base}`;
    const response=NextResponse.json({ok:true,redirectTo});
    response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
    response.cookies.set(TENANT_COOKIE,slug,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});
    return response;
  }catch{return NextResponse.json({error:"Não foi possível entrar agora."},{status:503})}
}