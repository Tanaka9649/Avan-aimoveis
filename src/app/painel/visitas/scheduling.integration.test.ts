import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

const mock = vi.hoisted(() => ({ db: null as unknown, user: { id: "40000000-0000-4000-8000-000000000001", role: "admin", access: { clients: "all" } } }));
vi.mock("@/db", () => ({ getDb: () => mock.db }));
vi.mock("@/lib/access", () => ({ requireModule: async () => mock.user, clientScope: () => undefined }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { saveVisit } from "./actions";
import { saveProposal } from "../propostas/actions";

const id = (n: number) => `40000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const form = (values: Record<string, string>) => { const data = new FormData(); for (const [key, value] of Object.entries(values)) data.set(key, value); return data; };
let pg: PGlite;

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
  await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Teste','agenda@example.invalid','unused','admin')", [mock.user.id]);
  await pg.query("insert into stages(id,name,position,color,is_won,is_lost) values($1,'Novos leads',0,'#aaa',false,false)", [id(2)]);
  await pg.query("insert into clients(id,name,phone,origin) values($1,'Cliente agenda','(34) 90000-0000','Site')", [id(3)]);
  await pg.query("insert into properties(id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private) values($1,'AG-1','Casa agenda','casa-agenda','Casa',40000000,'Teste','MG','Frutal','Centro','Teste')", [id(4)]);
  await pg.query("insert into deals(id,client_id,stage_id,title,position) values($1,$2,$3,'Negócio agenda','1')", [id(5), id(3), id(2)]);
}, 30000);

afterAll(async () => { await pg.close(); });

describe.sequential("agendamentos no fuso da operação", () => {
  it("stores a visit typed as 14:00 in Brasília as 17:00 UTC", async () => {
    const result = await saveVisit({ ok: false, message: "" }, form({ clientId: id(3), propertyId: id(4), dealId: "", scheduledAt: "2026-09-22T14:00", notes: "", status: "agendada" }));
    expect(result.ok).toBe(true);
    const { rows } = await pg.query<{ scheduled_at: Date }>("select scheduled_at from visits");
    expect(new Date(rows[0].scheduled_at).toISOString()).toBe("2026-09-22T17:00:00.000Z");
  });

  it("describes the visit in the activity feed using the local time the team typed", async () => {
    const { rows } = await pg.query<{ description: string }>("select description from activities where type='visita'");
    expect(rows[0].description).toContain("14:00");
  });

  it("rejects a visit without a usable date", async () => {
    const result = await saveVisit({ ok: false, message: "" }, form({ clientId: id(3), propertyId: id(4), dealId: "", scheduledAt: "ontem", notes: "", status: "agendada" }));
    expect(result.ok).toBe(false);
  });

  it("keeps a proposal deadline inside the chosen calendar day in Brasília", async () => {
    const result = await saveProposal({ ok: false, message: "" }, form({ dealId: id(5), propertyId: id(4), advertised: "400000", amount: "390000", counter: "", validUntil: "2026-09-22", status: "enviada", notes: "" }));
    expect(result.ok).toBe(true);
    const { rows } = await pg.query<{ valid_until: Date }>("select valid_until from proposals");
    expect(new Date(rows[0].valid_until).toISOString()).toBe("2026-09-23T02:59:59.000Z");
    expect(new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date(rows[0].valid_until))).toBe("2026-09-22");
  });
});
