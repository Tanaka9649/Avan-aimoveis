import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { tenantAuditLogs, tenants } from "@/db/schema";
import { requireAdmin } from "@/lib/access";

type VercelDomain = {
  verified?: boolean;
  verification?: Array<{ type: string; domain: string; value: string; reason?: string }>;
  error?: { code?: string; message?: string };
};

function vercelConfig() {
  const token = process.env.VERCEL_API_TOKEN;
  const project = process.env.VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_NAME;
  const teamId = process.env.VERCEL_TEAM_ID;
  if (!token || !project) return null;
  const query = teamId ? `?teamId=${encodeURIComponent(teamId)}` : "";
  return { token, project: encodeURIComponent(project), query };
}

async function vercelRequest(path: string, init: RequestInit) {
  const config = vercelConfig();
  if (!config) throw new Error("VERCEL_DOMAIN_CONFIG_MISSING");
  return fetch(`https://api.vercel.com${path.replace("{project}", config.project)}${config.query}`, {
    ...init,
    headers: { authorization: `Bearer ${config.token}`, "content-type": "application/json", ...(init.headers || {}) },
    cache: "no-store",
  });
}

export async function POST() {
  const admin = await requireAdmin();
  const db = getDb();
  const [tenant] = await db.select({ domain: tenants.customDomain }).from(tenants).where(eq(tenants.id, admin.tenantId)).limit(1);
  if (!tenant?.domain) return NextResponse.json({ error: "Salve um domínio antes de verificar." }, { status: 400 });
  if (!vercelConfig()) return NextResponse.json({ error: "A integração de domínios da Vercel ainda não foi configurada no ambiente." }, { status: 503 });

  try {
    let response = await vercelRequest("/v10/projects/{project}/domains", { method: "POST", body: JSON.stringify({ name: tenant.domain }) });
    let data = await response.json() as VercelDomain;
    if (!response.ok && data.error?.code !== "domain_already_in_use" && data.error?.code !== "not_modified") {
      await db.update(tenants).set({ domainStatus: "error", updatedAt: new Date() }).where(eq(tenants.id, admin.tenantId));
      return NextResponse.json({ error: data.error?.message || "A Vercel não aceitou o domínio." }, { status: response.status });
    }
    if (!data.verified) {
      response = await vercelRequest(`/v9/projects/{project}/domains/${encodeURIComponent(tenant.domain)}/verify`, { method: "POST" });
      data = await response.json() as VercelDomain;
    }
    const active = Boolean(response.ok && data.verified);
    await db.batch([
      db.update(tenants).set({ domainStatus: active ? "active" : "verifying", updatedAt: new Date() }).where(eq(tenants.id, admin.tenantId)),
      db.insert(tenantAuditLogs).values({
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        action: active ? "domain_activated" : "domain_verification_checked",
        entityType: "tenant_domain",
        entityId: tenant.domain,
        metadata: { status: active ? "active" : "verifying" },
      }),
    ]);
    return NextResponse.json({ status: active ? "active" : "verifying", verification: data.verification || [] });
  } catch (error) {
    console.error("tenant_domain_verification_failed", { tenantId: admin.tenantId, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Não foi possível consultar a Vercel agora." }, { status: 502 });
  }
}

export async function DELETE() {
  const admin = await requireAdmin();
  const db = getDb();
  const [tenant] = await db.select({ domain: tenants.customDomain }).from(tenants).where(eq(tenants.id, admin.tenantId)).limit(1);
  if (!tenant?.domain) return NextResponse.json({ ok: true });
  if (!vercelConfig()) return NextResponse.json({ error: "A integração da Vercel é necessária para remover o domínio com segurança." }, { status: 503 });

  try {
    const response = await vercelRequest(`/v9/projects/{project}/domains/${encodeURIComponent(tenant.domain)}`, { method: "DELETE" });
    if (!response.ok && response.status !== 404) {
      const data = await response.json() as VercelDomain;
      return NextResponse.json({ error: data.error?.message || "A Vercel não removeu o domínio." }, { status: response.status });
    }
    await db.batch([
      db.update(tenants).set({ customDomain: null, domainStatus: "pending", updatedAt: new Date() }).where(eq(tenants.id, admin.tenantId)),
      db.insert(tenantAuditLogs).values({
        tenantId: admin.tenantId,
        actorUserId: admin.id,
        action: "domain_removed",
        entityType: "tenant_domain",
        entityId: tenant.domain,
      }),
    ]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("tenant_domain_removal_failed", { tenantId: admin.tenantId, reason: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Não foi possível remover o domínio agora." }, { status: 502 });
  }
}
