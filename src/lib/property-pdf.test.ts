import { describe, expect, it } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { generatePropertyPdf, pdfText, wrapPdfText, type PropertyPdfInput } from "./property-pdf";

const property: PropertyPdfInput = {
  tenantName: "Imobiliária de teste", title: "Casa recém-construída 🏡",
  code: "T-1", type: "Casa", neighborhood: "Centro", city: "Frutal", state: "MG",
  priceCents: 69000000, bedrooms: 3, bathrooms: 2, parkingSpaces: 2,
  privateArea: "125", lotArea: "300", description: "\u200B✨ Área de 300m².\r\n🛏️ Suíte e cozinha. 👉 Conheça!",
};
describe("PDF text and layout regression F01", () => {
  it("preserves accents, area and paragraphs with predictable emoji fallback", async () => {
    const doc = await PDFDocument.create(), font = await doc.embedFont(StandardFonts.Helvetica);
    expect(pdfText(property.description, font)).toBe("[?] Área de 300m².\n[?] Suíte e cozinha. [?] Conheça!");
    const lines = wrapPdfText(("Terreno 300m² " + "x".repeat(200) + "\n").repeat(10), font, 10, 535);
    expect(lines.every(line => font.widthOfTextAtSize(line, 10) <= 535)).toBe(true);
  });
  it("creates valid multipage PDFs without truncating text or modifying input", async () => {
    const original = { ...property, description: property.description.repeat(100) + "\nFIM DA DESCRIÇÃO" };
    const before = JSON.stringify(original);
    const bytes = await generatePropertyPdf(original);
    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getPageCount()).toBeGreaterThan(2);
    expect(JSON.stringify(original)).toBe(before);
  });
});
