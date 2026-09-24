import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashToken, issueToken, verifyPassword } from "@/lib/security";
import { SESSION_COOKIE } from "@/lib/auth";
import { firstAllowedRoute } from "@/lib/permissions";
const input=z.object({email:z.email(),password:z.string().min(8).max(200)});
export async function POST(request:Request){const invalid=()=>NextResponse.json({error:"E-mail ou senha inválidos."},{status:401});try{const parsed=input.safeParse(await request.json());if(!parsed.success)return invalid();const ip=(await headers()).get("x-forwarded-for")?.split(",")[0]||"unknown";if(!await checkRateLimit(`login:${ip}`,8,15*60*1000))return NextResponse.json({error:"Aguarde alguns minutos antes de tentar novamente."},{status:429});const db=getDb();const [user]=await db.select().from(users).where(eq(users.email,parsed.data.email.toLowerCase())).limit(1);if(!user||!user.active||!await verifyPassword(parsed.data.password,user.passwordHash))return invalid();const token=issueToken();const expiresAt=new Date(Date.now()+7*24*60*60*1000);await db.insert(sessions).values({userId:user.id,tokenHash:hashToken(token),expiresAt});const response=NextResponse.json({ok:true,redirectTo:firstAllowedRoute(user)});response.cookies.set(SESSION_COOKIE,token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",expires:expiresAt});return response}catch{return NextResponse.json({error:"Não foi possível entrar agora."},{status:503})}}
