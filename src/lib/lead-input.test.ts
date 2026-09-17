import { describe, expect, it } from "vitest";
import { leadInput } from "./lead-input";

const valid = { name: "Cliente Teste", phone: "(11) 99999-9999", email: "CLIENTE@example.com", propertyId: "9a1ecf91-1c7a-4f99-a30f-f8c2af9f1001", consent: "true" };
describe("lead input", () => {
  it("normalizes email", () => expect(leadInput.parse(valid).email).toBe("cliente@example.com"));
  it("requires consent", () => expect(leadInput.safeParse({ ...valid, consent: "false" }).success).toBe(false));
  it("rejects invalid property IDs", () => expect(leadInput.safeParse({ ...valid, propertyId: "demo" }).success).toBe(false));
  it("rejects letters and short phone numbers", () => {
    for (const phone of ["abcdefghijk", "123", "11999999999abc"]) expect(leadInput.safeParse({ ...valid, phone }).success).toBe(false);
  });
  it("limits message length", () => expect(leadInput.safeParse({ ...valid, message: "x".repeat(1201) }).success).toBe(false));
});
