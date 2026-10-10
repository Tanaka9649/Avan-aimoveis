import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { applyDrizzleMigrations } from "@/test/apply-drizzle-migrations";
import { drizzle } from "drizzle-orm/pglite";

const mock = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", () => ({ getDb: () => mock.db }));

import { publicProperty, publicPropertyCards } from "./public-properties";

const TENANT_A = "61000000-0000-4000-8000-000000000001";
const TENANT_B = "62000000-0000-4000-8000-000000000001";
const PROPERTY_A = "61000000-0000-4000-8000-000000000011";
const PROPERTY_B = "62000000-0000-4000-8000-000000000011";
let pg: PGlite;

beforeAll(async () => {
  pg = new PGlite();
  await applyDrizzleMigrations(pg);
  mock.db = drizzle(pg);
  await pg.query("insert into tenants(id,name,slug,status,plan) values($1,'Tenant A','tenant-a','active','max'),($2,'Tenant B','tenant-b','active','max')", [TENANT_A, TENANT_B]);
  await pg.query(
    "insert into properties(tenant_id,id,code,title,slug,status,type,price_cents,description,state,city,neighborhood,address_private,published_at) values($1,$2,'A-1','Casa A','casa-compartilhada','disponivel','Casa',10000000,'Descrição pública do imóvel A','MG','Frutal','Centro','Privado A',now()),($3,$4,'B-1','Casa B','casa-compartilhada','disponivel','Casa',20000000,'Descrição pública do imóvel B','SP','Barretos','Centro','Privado B',now())",
    [TENANT_A, PROPERTY_A, TENANT_B, PROPERTY_B],
  );
}, 30_000);

afterAll(async () => {
  await pg.close();
});

describe.sequential("public tenant isolation", () => {
  it("never mixes catalogues even when slugs are identical", async () => {
    const [a, b] = await Promise.all([publicPropertyCards(TENANT_A), publicPropertyCards(TENANT_B)]);
    expect(a.map((property) => property.title)).toEqual(["Casa A"]);
    expect(b.map((property) => property.title)).toEqual(["Casa B"]);
  });

  it("returns no metadata for a resource requested through another tenant", async () => {
    const property = await publicProperty(TENANT_A, "casa-compartilhada");
    expect(property?.id).toBe(PROPERTY_A);
    expect(JSON.stringify(property)).not.toContain("Casa B");
    expect(JSON.stringify(property)).not.toContain("Privado A");
  });

  it("fails closed for an unknown tenant", async () => {
    expect(await publicPropertyCards("63000000-0000-4000-8000-000000000001")).toEqual([]);
  });
});
