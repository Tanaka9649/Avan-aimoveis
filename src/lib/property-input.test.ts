import { describe, expect, it } from "vitest";
import { propertyInput } from "./property-input";

const valid = {
  code: "AV-101",
  title: "Casa de teste",
  slug: "casa-de-teste",
  type: "Casa",
  price: "100.01",
  area: "50.5",
  bedrooms: "2",
  suites: "1",
  bathrooms: "1",
  parking: "0",
  state: "sp",
  city: "São Paulo",
  neighborhood: "Centro",
  address: "Rua privada 123",
  description: "Uma descrição suficientemente longa para validação.",
  status: "rascunho",
};

describe("property input", () => {
  it("converts decimal money to exact cents", () => expect(propertyInput.parse(valid).price).toBe(10001));
  it("normalizes state", () => expect(propertyInput.parse(valid).state).toBe("SP"));

  it("accepts suites as a structured field", () => {
    expect(propertyInput.parse(valid).suites).toBe(1);
  });

  it("accepts Terreno as a supported property type", () => {
    const result = propertyInput.safeParse({
      ...valid,
      type: "Terreno",
      area: "",
      lotArea: "250",
      bedrooms: "0",
      suites: "0",
      bathrooms: "0",
      parking: "0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects overflow, exponent and extra decimals", () => {
    for (const price of ["21474836.48", "1e6", "2.001", "-1", "0"]) {
      expect(propertyInput.safeParse({ ...valid, price }).success).toBe(false);
    }
  });

  it("requires lot area for Terreno but keeps it optional for Casa", () => {
    expect(propertyInput.safeParse({ ...valid, type: "Terreno", area: "", lotArea: "" }).success).toBe(false);
    expect(propertyInput.safeParse({ ...valid, type: "Casa", lotArea: "" }).success).toBe(true);
  });

  it("rejects suites outside the supported range", () => {
    expect(propertyInput.safeParse({ ...valid, suites: "101" }).success).toBe(false);
  });

  it("does not allow sale completion through the property form", () => {
    expect(propertyInput.safeParse({ ...valid, status: "vendido" }).success).toBe(false);
  });
});
