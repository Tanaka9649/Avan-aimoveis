import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { SESSION_COOKIE } from "@/lib/auth";
import { hashToken } from "@/lib/security";
export async function POST(request:Request){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(token)await getDb().delete(sessions).where(eq(sessions.tokenHash,hashToken(token)));const response=NextResponse.redirect(new URL("/login",request.url));response.cookies.delete(SESSION_COOKIE);return response}
