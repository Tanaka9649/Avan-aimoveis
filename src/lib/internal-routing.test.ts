import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("internal 404 routing", () => {
  it("keeps missing panel and superadmin routes inside their internal surfaces", () => {
    for (const path of [
      "src/app/painel/[...missing]/page.tsx",
      "src/app/superadmin/[...missing]/page.tsx",
      "src/app/empresa/[tenantSlug]/painel/[...missing]/page.tsx",
    ]) {
      const full = resolve(path);
      expect(existsSync(full), path).toBe(true);
      expect(readFileSync(full, "utf8")).toContain("notFound()");
    }
  });

  it("provides dedicated internal not-found pages", () => {
    expect(existsSync(resolve("src/app/painel/not-found.tsx"))).toBe(true);
    expect(existsSync(resolve("src/app/superadmin/not-found.tsx"))).toBe(true);
    expect(existsSync(resolve("src/app/empresa/[tenantSlug]/painel/not-found.tsx"))).toBe(true);
  });
});
