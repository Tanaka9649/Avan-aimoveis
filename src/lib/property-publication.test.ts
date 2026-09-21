import { describe, expect, it } from "vitest";
import {
  canPublish,
  isPublished,
  isPubliclyVisible,
  publicPropertyPath,
  publicationBlockers,
  sharePropertyMessage,
  siteVisibility,
  whatsappShareUrl,
} from "./property-publication";

const complete = {
  status: "disponivel",
  title: "Casa Cidade das Águas",
  priceCents: 40000000,
  description: "Casa térrea com quintal, sala ampla e garagem coberta para dois carros.",
  neighborhood: "Centro",
  city: "Frutal",
  state: "MG",
  area: 120,
  photoCount: 3,
};

describe("publication state", () => {
  it("separates the publish switch from the commercial status", () => {
    const draftButPublished = { status: "rascunho", publishedAt: new Date() };
    expect(isPublished(draftButPublished)).toBe(true);
    expect(isPubliclyVisible(draftButPublished)).toBe(false);
    expect(isPubliclyVisible({ status: "disponivel", publishedAt: null })).toBe(false);
    expect(isPubliclyVisible({ status: "disponivel", publishedAt: new Date() })).toBe(true);
  });

  it("keeps a sold or paused property out of the catalogue", () => {
    for (const status of ["vendido", "pausado", "reservado", "rascunho"])
      expect(isPubliclyVisible({ status, publishedAt: new Date() })).toBe(false);
  });

  it("answers 'está no site?' in one line", () => {
    expect(siteVisibility({ status: "disponivel", publishedAt: new Date() })).toMatchObject({ published: true, label: "No site" });
    expect(siteVisibility({ status: "vendido", publishedAt: new Date() }).detail).toContain("Vendido");
    expect(siteVisibility({ status: "disponivel", publishedAt: null }).label).toBe("Não publicado");
  });
});

describe("publication requirements", () => {
  it("accepts a complete listing", () => {
    expect(publicationBlockers(complete)).toEqual([]);
    expect(canPublish(complete)).toBe(true);
  });

  it("lists exactly what is missing", () => {
    expect(publicationBlockers({ ...complete, photoCount: 0, description: "curta" })).toEqual([
      "Descrição com pelo menos 30 caracteres",
      "Pelo menos 1 foto",
    ]);
  });

  it("never asks for owner documents or commission", () => {
    const labels = publicationBlockers({ status: "rascunho" }).join(" ").toLowerCase();
    expect(labels).not.toContain("document");
    expect(labels).not.toContain("proprietário");
    expect(labels).not.toContain("comissão");
  });

  it("refuses to publish a sold property", () => {
    expect(canPublish({ ...complete, status: "vendido" })).toBe(false);
  });
});

describe("sharing", () => {
  it("builds a readable, stable public path from the slug", () => {
    expect(publicPropertyPath("casa-cidade-das-aguas-cda-001")).toBe("/imoveis/casa-cidade-das-aguas-cda-001");
  });

  it("writes a message with the real link, never an internal id", () => {
    const message = sharePropertyMessage({ title: "Casa Cidade das Águas", slug: "casa-cidade-das-aguas", priceCents: 40000000, neighborhood: "Centro", city: "Frutal", bedrooms: 2, bathrooms: 2, parkingSpaces: 2 });
    expect(message).toContain("Casa Cidade das Águas");
    expect(message).toContain("2 quartos • 2 banheiros • 2 vagas");
    expect(message).toContain("/imoveis/casa-cidade-das-aguas");
    expect(message).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it("omits specs that are zero instead of printing '0 quartos'", () => {
    const message = sharePropertyMessage({ title: "Terreno", slug: "terreno", priceCents: 10000000, neighborhood: "Centro", city: "Frutal", bedrooms: 0, bathrooms: 0, parkingSpaces: 0 });
    expect(message).not.toContain("0 quartos");
  });

  it("prefills WhatsApp with the client's number when there is one", () => {
    expect(whatsappShareUrl("oi", "(34) 99999-0000")).toBe(`https://wa.me/5534999990000?text=${encodeURIComponent("oi")}`);
    expect(whatsappShareUrl("oi", "")).toContain("https://wa.me/?text=");
  });
});
