import { NextRequest, NextResponse } from "next/server";
import { ROOT_TENANT_SLUG, normalizeTenantSlug } from "@/lib/tenant-routing";

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const scoped = pathname.match(/^\/empresa\/([^/]+)(?:\/(.*))?$/);
  if (scoped) {
    const slug = normalizeTenantSlug(scoped[1]);
    if (!slug) return NextResponse.next();
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", slug);
    const tail = scoped[2] || "";
    if (tail === "painel/login") return NextResponse.next({ request: { headers } });
    if (tail === "painel" || tail.startsWith("painel/")) {
      if (!request.cookies.has("avan_session")) return NextResponse.redirect(new URL(`/empresa/${slug}/painel/login`, request.url));
      const suffix = tail.slice("painel".length);
      return NextResponse.rewrite(new URL(`/painel${suffix}${request.nextUrl.search}`, request.url), { request: { headers } });
    }
    return NextResponse.next({ request: { headers } });
  }
  if (pathname.startsWith("/painel")) {
    const contextualSlug = normalizeTenantSlug(request.cookies.get("avan_tenant")?.value || ROOT_TENANT_SLUG);
    if (contextualSlug !== ROOT_TENANT_SLUG) return NextResponse.redirect(new URL(`/empresa/${contextualSlug}${pathname}${request.nextUrl.search}`, request.url));
    if (!request.cookies.has("avan_session")) return NextResponse.redirect(new URL("/login", request.url));
    const headers = new Headers(request.headers);
    headers.set("x-tenant-slug", ROOT_TENANT_SLUG);
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*", "/empresa/:tenantSlug/:path*"] };
