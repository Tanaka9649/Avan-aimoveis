import { describe, expect, it } from "vitest";
import {
  propertyErrors,
  propertyRecordId,
  propertySlug,
  propertySteps,
} from "./property-wizard";
const values = {
  code: "AV-123",
  title: "Casa com jardim",
  slug: "casa-com-jardim",
  type: "Casa",
  price: "450000.01",
  area: "120",
  bedrooms: "3",
  bathrooms: "2",
  parking: "2",
  state: "MG",
  city: "Uberlândia",
  neighborhood: "Santa Mônica",
  address: "Rua de teste, 100",
  description: "Casa iluminada, com jardim amplo e ambientes integrados.",
  status: "rascunho",
  features: "Piscina",
  ownerId: "",
  ownerName: "",
  ownerPhone: "",
  ownerEmail: "",
};
describe("property wizard", () => {
  it("uses six stages and maps every schema field", () => {
    expect(propertySteps).toHaveLength(6);
    expect(propertyErrors(values)).toEqual({});
  });
  it("generates readable slugs without accents or trailing hyphens", () => {
    expect(propertySlug("  Avança — São José! ")).toBe("avanca-sao-jose");
    expect(propertySlug("á ".repeat(200))).toHaveLength(199);
  });
  it("validates only the current stage on Continue", () => {
    const incomplete = { ...values, price: "", address: "", description: "" };
    expect(Object.keys(propertyErrors(incomplete, 0))).toEqual(["price"]);
    expect(Object.keys(propertyErrors(incomplete, 2))).toEqual(["address"]);
    expect(Object.keys(propertyErrors(incomplete, 3))).toEqual(["description"]);
  });
  it("requires the same fields for a draft as the existing server", () => {
    expect(
      propertyErrors({ ...values, area: "", status: "rascunho" }),
    ).toHaveProperty("area");
  });
  it("rejects decimal counts, invalid state and oversized price", () => {
    const errors = propertyErrors({
      ...values,
      bedrooms: "1.5",
      state: "Minas",
      price: "21474836.48",
    });
    expect(Object.keys(errors).sort()).toEqual(["bedrooms", "price", "state"]);
  });
  it("validates new owner but ignores unused new-owner fields when linking", () => {
    expect(
      propertyErrors({ ...values, ownerEmail: "invalid" }, 0),
    ).toHaveProperty("ownerEmail");
    expect(
      propertyErrors(
        { ...values, ownerId: "existing", ownerEmail: "invalid" },
        0,
      ),
    ).toEqual({});
  });
  it("does not mutate the form while checking stages", () => {
    const copy = { ...values };
    propertyErrors(copy, 1);
    expect(copy).toEqual(values);
  });
  it("keeps the saved draft id when a new property is published", () => {
    const draftId = "20c1fe72-3a8d-4537-82a9-025d09714fe6";
    expect(propertyRecordId(draftId, undefined)).toBe(draftId);
    expect(propertyRecordId(undefined, draftId)).toBe(draftId);
  });
});
