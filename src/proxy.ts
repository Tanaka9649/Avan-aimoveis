import { NextRequest, NextResponse } from "next/server";
import { ROOT_TENANT_SLUG, normalizeHostname, normalizeTenantSlug } from "@/lib/tenant-routing";

function platformRequest(request: NextRequest) {
  const host = normalizeHostname(request.headers.get("host"));
  const configured = normalizeHostname(process.env.ROOT_DOMAIN || process.env.NEXT_PUBLIC_SITE_URL || null);
  const preview = normalizeHostname(process.env.VERCEL_URL || null);
  return !host || host === configured || host === preview || host === "localhost";
}

function routeRequest(request: NextRequest, headers: Headers) {
  const pathname = request.nextUrl.pathname;
  headers.delete("x-tenant-slug");
  headers.delete("x-platform-api");
  if (pathname.startsWith("/api/")) headers.set("x-platform-api", "1");
  const scoped = pathname.match(/^\/empresa\/([^/]+)(?:\/(.*))?$/);
  if (scoped) {
    const slug = normalizeTenantSlug(scoped[1]);
    if (!slug) return NextResponse.next({ request: { headers } });
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
    if (platformRequest(request)) {
      const contextualSlug = normalizeTenantSlug(request.cookies.get("avan_tenant")?.value || ROOT_TENANT_SLUG);
      if (contextualSlug !== ROOT_TENANT_SLUG) {
        return NextResponse.redirect(new URL(`/empresa/${contextualSlug}${pathname}${request.nextUrl.search}`, request.url));
      }
      headers.set("x-tenant-slug", ROOT_TENANT_SLUG);
    }
    return NextResponse.next({ request: { headers } });
  }
  return NextResponse.next({ request: { headers } });
}

export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const policy = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self' https:${isDev ? " ws: http:" : ""}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'`;
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", policy);
  const response = routeRequest(request, headers);
  if (!request.nextUrl.pathname.startsWith("/api/")) response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
