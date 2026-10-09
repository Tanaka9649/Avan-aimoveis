import { expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  headers: new Map<string, string>(),
  databaseAccessed: false,
}));

vi.mock("next/headers", () => ({
  headers: async () => ({ get: (name: string) => fixture.headers.get(name) ?? null }),
}));
vi.mock("@/db", () => ({
  getDb: () => {
    fixture.databaseAccessed = true;
    throw new Error("database must not be used when the host is absent");
  },
}));

import { tenantForRequest } from "./tenant";

it("fails closed when a request has neither an explicit tenant slug nor a host", async () => {
  fixture.headers.clear();
  fixture.databaseAccessed = false;
  await expect(tenantForRequest()).resolves.toBeNull();
  expect(fixture.databaseAccessed).toBe(false);
});
