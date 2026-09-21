import { GetObjectCommand } from "@aws-sdk/client-s3";
import { and, eq } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import sharp from "sharp";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyPhotos } from "@/db/schema";
import { currentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { variantKey } from "@/lib/photos";
import { publiclyVisible } from "@/lib/public-properties";

export const runtime = "nodejs";
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; if (!z.uuid().safeParse(id).success) return new NextResponse(null, { status: 404 });
  const user = await currentUser(); const db = getDb();
  const [p] = await db.select().from(properties).where(user ? eq(properties.id, id) : and(eq(properties.id, id), publiclyVisible())).limit(1);
  if (!p) return new NextResponse(null, { status: 404 });
  const [photo] = await db.select({ storagePath: propertyPhotos.storagePath, variants: propertyPhotos.variants }).from(propertyPhotos).where(and(eq(propertyPhotos.propertyId, id), eq(propertyPhotos.isCover, true))).limit(1);
  const pdf = await PDFDocument.create(); const page = pdf.addPage([595, 842]); const regular = await pdf.embedFont(StandardFonts.Helvetica); const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(.98, .98, .99) });
  if (photo) try { const object = await storageClient().send(new GetObjectCommand({ Bucket: PHOTO_BUCKET, Key: variantKey(photo, "medium") })); if (object.Body) { const jpg = await sharp(Buffer.from(await object.Body.transformToByteArray())).jpeg({ quality: 86 }).toBuffer(); const image = await pdf.embedJpg(jpg); const height = 230; const width = Math.min(535, height * image.width / image.height); page.drawImage(image, { x: 30, y: 575, width, height }); } } catch {}
  page.drawText("AVANCA IMOVEIS", { x: 30, y: 545, size: 10, font: bold, color: rgb(.09, .36, .78) });
  page.drawText(p.title, { x: 30, y: 510, size: 22, font: bold, color: rgb(.08, .1, .14), maxWidth: 535 });
  page.drawText(`${p.code}  |  ${p.type}  |  ${p.neighborhood}, ${p.city}/${p.state}`, { x: 30, y: 482, size: 10, font: regular, color: rgb(.35, .4, .48) });
  page.drawText(formatMoney(p.priceCents), { x: 30, y: 440, size: 24, font: bold, color: rgb(.08, .1, .14) });
  page.drawText(`${p.bedrooms} quartos   |   ${p.bathrooms} banheiros   |   ${p.parkingSpaces} vagas   |   ${Number(p.privateArea || 0).toLocaleString("pt-BR")} m2`, { x: 30, y: 410, size: 11, font: regular, color: rgb(.2, .24, .3) });
  const words = p.description.replace(/\s+/g, " ").slice(0, 700).split(" "); const lines: string[] = []; let line = ""; for (const word of words) { if ((line + " " + word).length > 88) { lines.push(line); line = word; } else line += (line ? " " : "") + word; } if (line) lines.push(line);
  lines.slice(0, 8).forEach((text, index) => page.drawText(text, { x: 30, y: 365 - index * 18, size: 10, font: regular, color: rgb(.25, .29, .35) }));
  page.drawText("Fale com a Avanca Imoveis: (34) 9990-0553", { x: 30, y: 48, size: 10, font: bold, color: rgb(.09, .36, .78) });
  return new NextResponse(Buffer.from(await pdf.save()), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${p.slug}.pdf"`, "Cache-Control": "private, no-store" } });
}
