import { describe, expect, it } from "vitest";
import {
  formatBrazilianPhone,
  isValidBrazilianPhone,
  normalizeEmail,
  normalizePersonName,
  normalizePhone,
  ownerIdentityKey,
  sameOwnerIdentity,
} from "./owner-identity";

describe("owner identity", () => {
  it("normalizes owner contact data", () => {
    expect(normalizePhone("(34) 99977-7123")).toBe("34999777123");
    expect(normalizeEmail("  TESTE@EXEMPLO.COM ")).toBe("teste@exemplo.com");
    expect(normalizePersonName("  João   da Silva ")).toBe("joão da silva");
  });

  it("prioritizes phone, then email, then name", () => {
    expect(ownerIdentityKey({ name: "A", phone: "(34) 99977-7123", email: "a@x.com" })).toBe("phone:34999777123");
    expect(ownerIdentityKey({ name: "A", phone: "", email: "A@X.COM" })).toBe("email:a@x.com");
    expect(ownerIdentityKey({ name: "João  Silva", phone: "", email: "" })).toBe("name:joão silva");
  });

  it("matches equivalent owners without confusing different contacts", () => {
    expect(sameOwnerIdentity(
      { name: "Matheus", phone: "(34) 99977-7123", email: null },
      { name: "Outro nome", phone: "34999777123", email: null },
    )).toBe(true);
    expect(sameOwnerIdentity(
      { name: "Matheus", phone: "34999777123", email: null },
      { name: "Matheus", phone: "34999999999", email: null },
    )).toBe(false);
  });

  it("validates and formats Brazilian phone numbers", () => {
    expect(isValidBrazilianPhone("34999777123")).toBe(true);
    expect(isValidBrazilianPhone("teste")).toBe(false);
    expect(formatBrazilianPhone("34999777123")).toBe("(34) 99977-7123");
  });
});
