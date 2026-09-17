import { expect, it } from "vitest";
import { propertyInput } from "./property-input";
const valid = { code: "AV-101", title: "Casa de teste", slug: "casa-de-teste", type: "Casa", price: "100.01", area: "50.5", bedrooms: "2", bathrooms: "1", parking: "0", state: "sp", city: "São Paulo", neighborhood: "Centro", address: "Rua privada 123", description: "Uma descrição suficientemente longa para validação.", status: "rascunho" };
it("converts decimal money to exact cents", () => expect(propertyInput.parse(valid).price).toBe(10001));
it("rejects overflow, exponent and extra decimals", () => { for (const price of ["21474836.48", "1e6", "2.001", "-1", "0"]) expect(propertyInput.safeParse({ ...valid, price }).success).toBe(false); });
it("does not allow sale completion through the property form", () => expect(propertyInput.safeParse({ ...valid, status: "vendido" }).success).toBe(false));
it("normalizes state", () => expect(propertyInput.parse(valid).state).toBe("SP"));
