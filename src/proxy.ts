import { NextRequest, NextResponse } from "next/server";
import { ROOT_TENANT_SLUG, normalizeTenantSlug } from "@/lib/tenant";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const scoped = pathname.match(/^\/empresa\/([^/]+)\/painel(?:\/(.*))?$/);
  if (scoped && !pathname.endsWith("/painel/login")) {
    const slug = normalizeTenantSlug(scoped[1]);
    if (!slug) return NextResponse.next();
    if (!request.cookies.has("avan_session")) return NextResponse.redirect(new URL(`/empresa/${slug}/painel/login`, request.url));
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", slug);
    const suffix = scoped[2] ? `/${scoped[2]}` : "";
    return NextResponse.rewrite(new URL(`/painel${suffix}${request.nextUrl.search}`, request.url), { request: { headers } });
  }
  if (pathname.startsWith("/painel")) {
    if (!request.cookies.has("avan_session")) return NextResponse.redirect(new URL("/login", request.url));
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", ROOT_TENANT_SLUG);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}
export const config={matcher:["/painel/:path*","/empresa/:path*/painel/:path*"]};
