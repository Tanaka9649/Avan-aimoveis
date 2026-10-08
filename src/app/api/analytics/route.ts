import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsEvents, properties } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { hashIdentifier } from "@/lib/security";
import { publiclyVisible } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

const eventTypes = ["page_view", "listing_impression", "search", "interest_submit"] as const;
const input = z.object({
  tenantSlug: z.string().min(1).max(120),
  propertyId: z.uuid().optional(),
  eventType: z.enum(eventTypes),
  anonymousSessionId: z.string().min(16).max(160),
  path: z.string().max(500).optional(),
  utm: z.object({ source: z.string().max(160).optional(), medium: z.string().max(160).optional(), campaign: z.string().max(160).optional(), content: z.string().max(160).optional(), term: z.string().max(160).optional() }).optional(),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const data = parsed.data;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!await checkRateLimit(`analytics:${hashIdentifier(ip)}`, 120, 60_000)) return new NextResponse(null, { status: 204 });

  const resolution = await tenantBySlug(data.tenantSlug);
  const tenant = resolution?.tenant;
  if (!tenant || !tenantOperational(tenant.status)) return new NextResponse(null, { status: 404 });

  let propertyId: string | null = null;
  if (data.propertyId) {
    const [property] = await getDb().select({ id: properties.id }).from(properties).where(and(eq(properties.id, data.propertyId), eq(properties.tenantId, tenant.id), publiclyVisible())).limit(1);
    if (!property) return new NextResponse(null, { status: 404 });
    propertyId = property.id;
  }

  const day = new Date().toISOString().slice(0, 10);
  const dedupeKey = data.eventType === "interest_submit"
    ? null
    : hashIdentifier(`${data.eventType}:${data.anonymousSessionId}:${propertyId || data.path || "/"}:${day}`);
  await getDb().insert(analyticsEvents).values({
    tenantId: tenant.id,
    propertyId,
    eventType: data.eventType,
    anonymousSessionId: hashIdentifier(data.anonymousSessionId),
    utmSource: data.utm?.source,
    utmMedium: data.utm?.medium,
    utmCampaign: data.utm?.campaign,
    utmContent: data.utm?.content,
    utmTerm: data.utm?.term,
    referrer: requestHeaders.get("referer"),
    dedupeKey,
  }).onConflictDoNothing();
  return new NextResponse(null, { status: 204 });
}
