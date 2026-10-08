import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions } from "@/db/schema";
import { SESSION_COOKIE, TENANT_COOKIE } from "@/lib/auth";
import { hashToken } from "@/lib/security";
import { ROOT_TENANT_SLUG, normalizeTenantSlug } from "@/lib/tenant-routing";

export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const tenantSlug = normalizeTenantSlug(jar.get(TENANT_COOKIE)?.value || ROOT_TENANT_SLUG);
  if (token) await getDb().delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  const loginPath = tenantSlug === ROOT_TENANT_SLUG ? "/login" : `/empresa/${tenantSlug}/painel/login`;
  const response = NextResponse.redirect(new URL(loginPath, request.url));
  response.cookies.delete(SESSION_COOKIE);
  response.cookies.delete(TENANT_COOKIE);
  return response;
}
