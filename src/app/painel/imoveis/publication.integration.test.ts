import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

const mock = vi.hoisted(() => ({ db: null as unknown, user: { id: "50000000-0000-4000-8000-000000000001", role: "admin", access: { clients: "all" } } }));
vi.mock("@/db", () => ({ getDb: () => mock.db }));
vi.mock("@/lib/access", () => ({ requireModule: async () => mock.user, clientScope: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { publishProperty, unpublishProperty } from "./actions";
import { publicProperty, publicPropertyCards } from "@/lib/public-properties";

const id = (n: number) => `50000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const PROPERTY = id(9);
let pg: PGlite;

const insertProperty = (overrides: Partial<Record<string, string | number | null>> = {}) => {
  const values = { id: PROPERTY, code: "CDA-001", title: "Casa Cidade das Águas", slug: "casa-cidade-das-aguas-cda-001", type: "Casa", price: 40000000, description: "Casa térrea com quintal, sala ampla e garagem coberta para dois carros.", state: "MG", city: "Frutal", neighborhood: "Centro", address: "Rua interna, 100", area: "120.00", status: "rascunho", ...overrides };
  return pg.query(
    "insert into properties(id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private,private_area,status) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)",
    [values.id, values.code, values.title, values.slug, values.type, values.price, values.description, values.state, values.city, values.neighborhood, values.address, values.area, values.status],
  );
};

beforeAll(async () => {
  pg = new PGlite();
  for (const file of readdirSync(resolve("drizzle")).filter((name) => name.endsWith(".sql")).sort())
    for (const statement of readFileSync(resolve("drizzle", file), "utf8").split("--> statement-breakpoint"))
      if (statement.trim()) await pg.exec(statement);
  const db = drizzle(pg);
  mock.db = Object.assign(db, {
    batch: async (queries: { toSQL: () => { sql: string; params: unknown[] } }[]) =>
      pg.transaction(async (tx) => { const results = []; for (const query of queries) { const q = query.toSQL(); results.push(await tx.query(q.sql, q.params)); } return results; }),
  });
  await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Teste','pub@example.invalid','unused','admin')", [mock.user.id]);
  await insertProperty();
}, 30000);

afterAll(async () => { await pg.close(); });

describe.sequential("fluxo de publicação ponta a ponta", () => {
  it("keeps a draft out of the catalogue and out of its own public URL", async () => {
    expect(await publicPropertyCards()).toHaveLength(0);
    expect(await publicProperty("casa-cidade-das-aguas-cda-001")).toBeNull();
  });

  it("refuses to publish while the listing has no photo, and says what is missing", async () => {
    const result = await publishProperty(PROPERTY);
    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(["Pelo menos 1 foto"]);
    expect(await publicPropertyCards()).toHaveLength(0);
  });

  it("publishes once the requirements are met and returns the shareable URL", async () => {
    await pg.query("insert into property_photos(id,property_id,storage_path,alt,position,is_cover,variants) values($1,$2,'k/full.webp','Capa',0,true,$3)", [id(20), PROPERTY, JSON.stringify({ thumb: "k/thumb.webp", medium: "k/medium.webp", full: "k/full.webp" })]);
    const result = await publishProperty(PROPERTY);
    expect(result.ok).toBe(true);
    expect(result.url).toContain("/imoveis/casa-cidade-das-aguas-cda-001");
    const cards = await publicPropertyCards();
    expect(cards).toHaveLength(1);
    expect(cards[0].cover?.url).toBe(`/api/property-photos/${id(20)}?v=thumb`);
    const detail = await publicProperty("casa-cidade-das-aguas-cda-001");
    expect(detail?.gallery).toHaveLength(1);
    expect(Object.keys(detail!)).not.toContain("status");
  });

  it("never exposes the private address, coordinates or commission on public routes", async () => {
    const detail = await publicProperty("casa-cidade-das-aguas-cda-001");
    const serialized = JSON.stringify(detail);
    expect(serialized).not.toContain("Rua interna");
    for (const field of ["addressPrivate", "latitudePrivate", "longitudePrivate", "commissionPercent", "acquisitionType", "status"])
      expect(serialized).not.toContain(field);
  });

  it("logs the publication instead of silently flipping a flag", async () => {
    const { rows } = await pg.query<{ action: string }>("select action from activity_logs where entity_id=$1 order by created_at", [PROPERTY]);
    expect(rows.map((row) => row.action)).toContain("published");
  });

  it("removes it from the catalogue when unpublished, keeping the record intact", async () => {
    expect((await unpublishProperty(PROPERTY)).ok).toBe(true);
    expect(await publicPropertyCards()).toHaveLength(0);
    expect(await publicProperty("casa-cidade-das-aguas-cda-001")).toBeNull();
    const { rows } = await pg.query<{ title: string }>("select title from properties where id=$1", [PROPERTY]);
    expect(rows[0].title).toBe("Casa Cidade das Águas");
  });

  it("takes a sold property out of the catalogue without losing that it was published", async () => {
    await publishProperty(PROPERTY);
    expect(await publicPropertyCards()).toHaveLength(1);
    await pg.query("update properties set status='vendido' where id=$1", [PROPERTY]);
    expect(await publicPropertyCards()).toHaveLength(0);
    expect(await publicProperty("casa-cidade-das-aguas-cda-001")).toBeNull();
    const { rows } = await pg.query<{ published_at: Date | null }>("select published_at from properties where id=$1", [PROPERTY]);
    expect(rows[0].published_at).not.toBeNull();
    expect((await publishProperty(PROPERTY)).ok).toBe(false);
  });
});
