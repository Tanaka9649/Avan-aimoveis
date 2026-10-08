import { NextRequest, NextResponse } from "next/server";
import { ROOT_TENANT_SLUG, normalizeHostname, normalizeTenantSlug } from "@/lib/tenant-routing";

function platformRequest(request: NextRequest) {
  const host = normalizeHostname(request.headers.get("host"));
  const configured = normalizeHostname(process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || null);
  const preview = normalizeHostname(process.env.VERCEL_URL || null);
  return !host || host === configured || host === preview || host === "localhost";
}

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
    if (!request.cookies.has("avan_session")) return NextResponse.redirect(new URL("/login", request.url));
    const headers = new Headers(request.headers);
    if (platformRequest(request)) {
      const contextualSlug = normalizeTenantSlug(request.cookies.get("avan_tenant")?.value || ROOT_TENANT_SLUG);
      if (contextualSlug !== ROOT_TENANT_SLUG) {
        return NextResponse.redirect(new URL(`/empresa/${contextualSlug}${pathname}${request.nextUrl.search}`, request.url));
      }
      headers.set("x-tenant-slug", ROOT_TENANT_SLUG);
    }
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/painel/:path*", "/empresa/:tenantSlug/:path*"] };
