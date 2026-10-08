import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq, isNotNull } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos, tenants } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { variantKey } from "@/lib/photos";
import { PUBLIC_STATUS } from "@/lib/property-publication";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });

  const user = await currentUser();
  const db = getDb();
  const visibility = user
    ? and(eq(properties.id, id), eq(properties.tenantId, user.tenantId))
    : and(eq(properties.id, id), eq(properties.status, PUBLIC_STATUS), isNotNull(properties.publishedAt));
  const [row] = await db
    .select({ property: properties, tenant: tenants })
    .from(properties)
    .innerJoin(tenants, eq(tenants.id, properties.tenantId))
    .where(visibility)
    .limit(1);
  if (!row) return new NextResponse(null, { status: 404 });

  const p = row.property;
  const [photo] = await db
    .select({ storagePath: propertyPhotos.storagePath, variants: propertyPhotos.variants })
    .from(propertyPhotos)
    .where(
      and(
        eq(propertyPhotos.tenantId, row.tenant.id),
        eq(propertyPhotos.propertyId, id),
        eq(propertyPhotos.isCover, true),
      ),
    )
    .limit(1);

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.98, 0.98, 0.99) });

  if (photo) {
    try {
      const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: variantKey(photo, "medium") }));
      if (object.Body) {
        const jpg = await sharp(Buffer.from(await object.Body.transformToByteArray())).jpeg({ quality: 86 }).toBuffer();
        const image = await pdf.embedJpg(jpg);
        const height = 230;
        const width = Math.min(535, (height * image.width) / image.height);
        page.drawImage(image, { x: 30, y: 575, width, height });
      }
    } catch {
      // The PDF remains useful without a cover if object storage is temporarily unavailable.
    }
  }

  page.drawText(row.tenant.name.toUpperCase(), { x: 30, y: 545, size: 10, font: bold, color: rgb(0.09, 0.36, 0.78) });
  page.drawText(p.title, { x: 30, y: 510, size: 22, font: bold, color: rgb(0.08, 0.1, 0.14), maxWidth: 535 });
  page.drawText(`${p.code}  |  ${p.type}  |  ${p.neighborhood}, ${p.city}/${p.state}`, { x: 30, y: 482, size: 10, font: regular, color: rgb(0.35, 0.4, 0.48) });
  page.drawText(formatMoney(p.priceCents), { x: 30, y: 440, size: 24, font: bold, color: rgb(0.08, 0.1, 0.14) });
  page.drawText(`${p.bedrooms} quartos   |   ${p.bathrooms} banheiros   |   ${p.parkingSpaces} vagas   |   ${Number(p.privateArea || 0).toLocaleString("pt-BR")} m2`, { x: 30, y: 410, size: 11, font: regular, color: rgb(0.2, 0.24, 0.3) });

  const words = p.description.replace(/\s+/g, " ").slice(0, 700).split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if ((line + " " + word).length > 88) {
      lines.push(line);
      line = word;
    } else {
      line += (line ? " " : "") + word;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 8).forEach((text, index) => page.drawText(text, { x: 30, y: 365 - index * 18, size: 10, font: regular, color: rgb(0.25, 0.29, 0.35) }));

  const contact = row.tenant.phone || row.tenant.whatsapp;
  if (contact) page.drawText(`Fale com ${row.tenant.name}: ${contact}`, { x: 30, y: 48, size: 10, font: bold, color: rgb(0.09, 0.36, 0.78) });
  return new NextResponse(Buffer.from(await pdf.save()), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${p.slug}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
