import { describe, expect, it } from "vitest";
import { normalizeHostname, normalizeTenantSlug } from "./tenant-routing";

describe("tenant routing normalization", () => {
  it("creates stable, URL-safe tenant slugs", () => {
    expect(normalizeTenantSlug("  Imobiliária São José  ")).toBe("imobiliaria-sao-jose");
    expect(normalizeTenantSlug("XP___Imóveis")).toBe("xp-imoveis");
  });

  it("canonicalizes hosts and removes untrusted ports", () => {
    expect(normalizeHostname("WWW.XPIMOVEIS.COM.BR:443")).toBe("xpimoveis.com.br");
    expect(normalizeHostname(" xpimoveis.com.br ")).toBe("xpimoveis.com.br");
  });

  it("rejects malformed hostnames", () => {
    expect(normalizeHostname("https://xpimoveis.com.br/path")).toBeNull();
    expect(normalizeHostname("xp imóveis.com.br")).toBeNull();
  });
});
