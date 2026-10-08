import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { analyticsEvents, properties, propertyViews, whatsappClicks } from "@/db/schema";
import { hashIdentifier } from "@/lib/security";
import { publiclyVisible } from "@/lib/public-properties";
import { tenantBySlug, tenantOperational } from "@/lib/tenant";

const input = z.object({
  propertyId: z.uuid(),
  tenantSlug: z.string().min(1).max(120),
  type: z.enum(["view", "whatsapp"]),
  source: z.string().max(50).default("property"),
});

export async function POST(request: Request) {
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  const resolution = await tenantBySlug(parsed.data.tenantSlug);
  const tenant = resolution?.tenant;
  if (!tenant || !tenantOperational(tenant.status)) return new NextResponse(null, { status: 404 });

  const db = getDb();
  const [property] = await db
    .select({ id: properties.id, tenantId: properties.tenantId })
    .from(properties)
    .where(and(eq(properties.id, parsed.data.propertyId), publiclyVisible(tenant.id)))
    .limit(1);
  if (!property?.tenantId) return NextResponse.json({ error: "Imóvel não encontrado." }, { status: 404 });

  const requestHeaders = await headers();
  const visitorHash = hashIdentifier(`${requestHeaders.get("x-forwarded-for")?.split(",")[0] || "unknown"}:${requestHeaders.get("user-agent") || "unknown"}`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (parsed.data.type === "view") {
    await db.batch([
      db.insert(propertyViews).values({ tenantId: property.tenantId, propertyId: property.id, visitorHash, viewedOn: today }).onConflictDoNothing(),
      db.insert(analyticsEvents).values({ tenantId: property.tenantId, propertyId: property.id, eventType: "property_view", anonymousSessionId: visitorHash, referrer: requestHeaders.get("referer"), dedupeKey: `view:${property.id}:${visitorHash}:${today.toISOString().slice(0, 10)}` }).onConflictDoNothing(),
    ]);
  } else {
    await db.batch([
      db.insert(whatsappClicks).values({ tenantId: property.tenantId, propertyId: property.id, visitorHash, source: parsed.data.source }),
      db.insert(analyticsEvents).values({ tenantId: property.tenantId, propertyId: property.id, eventType: "whatsapp_click", anonymousSessionId: visitorHash, referrer: requestHeaders.get("referer") }),
    ]);
  }
  return NextResponse.json({ ok: true });
}
