import { describe, expect, it } from "vitest";
import { normalizeWhatsApp, whatsappContactUrl } from "./contact";
import { serializeJsonLd } from "./json-ld";
import { canWrite } from "./permissions";
import { isPlanConfigured } from "./plan-configuration";
import { NextRequest } from "next/server";
import { proxy } from "@/proxy";

describe("audit security regressions", () => {
  it("normalizes Brazilian WhatsApp and suppresses missing recipients", () => {
    expect(normalizeWhatsApp("(34) 99999-1234")).toBe("5534999991234");
    expect(normalizeWhatsApp("+55 34 99999-1234")).toBe("5534999991234");
    for (const invalid of ["", "123", "abc34999991234", "5500999991234"]) expect(whatsappContactUrl(invalid)).toBeNull();
  });
  it("keeps injected script terminators inside JSON data", () => {
    const payload = { description: '</script><script>alert("x")</script>&' };
    const serialized = serializeJsonLd(payload);
    expect(serialized).not.toContain("<");
    expect(JSON.parse(serialized)).toEqual(payload);
  });
  it("viewers cannot write while agents can", () => {
    expect(canWrite({ membershipRole: "viewer" })).toBe(false);
    expect(canWrite({ membershipRole: "agent" })).toBe(true);
  });
  it("clears externally supplied tenant routing headers", () => {
    const response = proxy(new NextRequest("https://platform.example/api/test", { headers: { "x-tenant-slug": "victim", "x-platform-api": "spoof" } }));
    expect(response.headers.get("x-middleware-request-x-tenant-slug")).toBeNull();
    expect(response.headers.get("x-middleware-request-x-platform-api")).toBe("1");
  });
  it("requires explicit plan decisions", () => {
    expect(isPlanConfigured({})).toBe(false);
    expect(isPlanConfigured({ max_users: null, max_properties: null, max_clients: null, max_opportunities: null, max_documents: null, max_storage_bytes: null, custom_domain: 0 })).toBe(true);
  });
});
