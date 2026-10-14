import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { formatMoney } from "./format";

const segmenter = new Intl.Segmenter("pt-BR", { granularity: "grapheme" });

/** Presentation-only conversion; the original database text is never changed.
 * Helvetica supports Portuguese/². Unsupported graphemes use [?], not silent loss.
 */
export function pdfText(value: string, font: PDFFont) {
  const text = value.normalize("NFC").replace(/\r\n?/g, "\n")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g, "")
    .replace(/\t/g, "    ");
  return Array.from(segmenter.segment(text), ({ segment }) => {
    if (segment === "\n") return segment;
    try { font.encodeText(segment); return segment; } catch { return "[?]"; }
  }).join("");
}

export function wrapPdfText(value: string, font: PDFFont, size: number, width: number) {
  const lines: string[] = [];
  for (const paragraph of pdfText(value, font).split("\n")) {
    let line = "";
    for (const word of paragraph.trim().split(/\s+/)) {
      const candidate = line ? line + " " + word : word;
      if (font.widthOfTextAtSize(candidate, size) <= width) { line = candidate; continue; }
      if (line) lines.push(line);
      line = "";
      // Long URLs/words cannot overflow the printable area.
      for (const char of word) {
        if (line && font.widthOfTextAtSize(line + char, size) > width) {
          lines.push(line); line = "";
        }
        line += char;
      }
    }
    lines.push(line);
  }
  return lines;
}

export type PropertyPdfInput = {
  tenantName: string; contact?: string | null; title: string; code: string;
  type: string; neighborhood: string; city: string; state: string;
  suites?: number; features?: string[]; priceCents: number; bedrooms: number; bathrooms: number; parkingSpaces: number;
  privateArea: string | null; lotArea: string | null; description: string;
};

export async function generatePropertyPdf(p: PropertyPdfInput, coverJpg?: Uint8Array) {
  const pdf = await PDFDocument.create();
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const width = 535;
  let page = pdf.addPage([595, 842]);
  let y = 800;
  const nextPage = () => { page = pdf.addPage([595, 842]); y = 800; };
  const write = (text: string, size = 11, font = regular, gap = 12) => {
    for (const line of wrapPdfText(text, font, size, width)) {
      if (!line) { y -= size * 0.65; continue; }
      if (y < 80 + size) nextPage();
      page.drawText(line, { x: 30, y, size, font, color: rgb(0.12, 0.15, 0.19) });
      y -= size * 1.5;
    }
    y -= gap;
  };
  write(p.tenantName, 11, bold);
  if (coverJpg) {
    const image = await pdf.embedJpg(coverJpg);
    const scale = Math.min(width / image.width, 230 / image.height);
    const imageWidth = image.width * scale, imageHeight = image.height * scale;
    page.drawImage(image, { x: 30 + (width - imageWidth) / 2, y: y - imageHeight, width: imageWidth, height: imageHeight });
    y -= imageHeight + 28;
  }
  write(p.title, 22, bold);
  write([p.code, p.type, p.neighborhood + ", " + p.city + "/" + p.state].join(" | "), 10);
  write(formatMoney(p.priceCents), 22, bold);
  write(p.bedrooms + " quartos | " + p.bathrooms + " banheiros | " + p.parkingSpaces + " vagas");
  if (p.suites) write(`${p.suites} ${p.suites === 1 ? "suíte" : "suítes"}`);
  if (p.features?.length) write("Características: " + p.features.join(", "));
  const areas = [
    p.privateArea ? "Construída/privativa: " + Number(p.privateArea).toLocaleString("pt-BR") + " m²" : "",
    p.lotArea ? "Terreno: " + Number(p.lotArea).toLocaleString("pt-BR") + " m²" : "",
  ].filter(Boolean);
  if (areas.length) write(areas.join(" | "));
  write(p.description);
  if (p.contact) write("Fale com " + p.tenantName + ": " + p.contact, 10, bold);
  const pages = pdf.getPages();
  pages.forEach((item, index) => item.drawText(
    "Página " + (index + 1) + " de " + pages.length,
    { x: 30, y: 30, size: 8, font: regular, color: rgb(0.4, 0.4, 0.4) },
  ));
  pdf.setTitle(pdfText(p.title, regular));
  pdf.setAuthor(pdfText(p.tenantName, regular));
  return pdf.save();
}
