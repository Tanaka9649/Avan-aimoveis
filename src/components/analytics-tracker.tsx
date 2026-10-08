"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "avan:anonymous-session";

function sessionId() {
  const existing = sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, created);
  return created;
}

export function AnalyticsTracker({ tenantSlug }: { tenantSlug: string }) {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.includes("/painel") || pathname.startsWith("/superadmin") || pathname.startsWith("/convite")) return;
    const params = new URLSearchParams(window.location.search);
    const payload = {
      tenantSlug,
      eventType: pathname.endsWith("/imoveis") ? "search" : "site_view",
      anonymousSessionId: sessionId(),
      path: `${pathname}${window.location.search}`,
      utm: {
        source: params.get("utm_source") || undefined,
        medium: params.get("utm_medium") || undefined,
        campaign: params.get("utm_campaign") || undefined,
        content: params.get("utm_content") || undefined,
        term: params.get("utm_term") || undefined,
      },
    };
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), keepalive: true });
  }, [pathname, tenantSlug]);
  return null;
}
