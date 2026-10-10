import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyDrizzleMigrations } from "@/test/apply-drizzle-migrations";
import { modules } from "@/lib/permissions";

const mock = vi.hoisted(() => ({
  db: null as unknown,
  actor: {
    id: "40000000-0000-4000-8000-000000000001",
    tenantId: "00000000-0000-4000-8000-000000000001",
  },
}));

vi.mock("@/db", () => ({ getDb: () => mock.db }));
vi.mock("@/lib/access", () => ({ requireSuperAdmin: async () => mock.actor }));
vi.mock("@/lib/tenant-audit", () => ({ auditTenantAction: vi.fn(async () => undefined) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: vi.fn() }));

import { setGlobalUserActive, updatePlanDefinition, updateTenantMembership } from "./actions";

const tenantId = "00000000-0000-4000-8000-000000000001";
const adminUserId = "40000000-0000-4000-8000-000000000002";
const agentUserId = "40000000-0000-4000-8000-000000000003";
const secondAdminId = "40000000-0000-4000-8000-000000000004";
let adminMembershipId = "";
let agentMembershipId = "";
let pg: PGlite;

function planForm() {
  const form = new FormData();
  form.set("max_users", "3");
  form.set("max_properties", "25");
  form.set("max_clients", "100");
  form.set("max_opportunities", "100");
  form.set("max_documents", "200");
  form.set("max_storage_gb", "2");
  form.set("custom_domain", "0");
  for (const module of modules) form.set("module:" + module, "on");
  return form;
}

beforeAll(async () => {
  pg = new PGlite();
  await applyDrizzleMigrations(pg);
  mock.db = drizzle(pg);
  await pg.query(
    "insert into users(id,name,email,password_hash,role,global_role,active) values($1,'Super','super@example.invalid','unused','admin','super_admin',true),($2,'Admin','admin@example.invalid','unused','admin','user',true),($3,'Corretor','agent@example.invalid','unused','equipe','user',true),($4,'Segundo Admin','admin2@example.invalid','unused','admin','user',true)",
    [mock.actor.id, adminUserId, agentUserId, secondAdminId],
  );
  const admin = await pg.query<{id:string}>("insert into tenant_memberships(tenant_id,user_id,role,status,permissions,activated_at) values($1,$2,'admin','active',$3,now()) returning id", [tenantId, adminUserId, JSON.stringify({modules,clients:"all"})]);
  adminMembershipId = admin.rows[0].id;
  const agent = await pg.query<{id:string}>("insert into tenant_memberships(tenant_id,user_id,role,status,permissions,activated_at) values($1,$2,'agent','active',$3,now()) returning id", [tenantId, agentUserId, JSON.stringify({modules,clients:"all"})]);
  agentMembershipId = agent.rows[0].id;
}, 30000);

afterAll(async () => { await pg.close(); });

describe.sequential("superadmin governance", () => {
  it("updates the existing plan engine instead of creating a second quota system", async () => {
    const result = await updatePlanDefinition("starter", { ok:false, message:"" }, planForm());
    expect(result.ok).toBe(true);
    const row = (await pg.query<{limits:Record<string,number|null>;modules:string[]}>("select limits,modules from plans where code='starter'")).rows[0];
    expect(row.limits.max_users).toBe(3);
    expect(row.limits.max_properties).toBe(25);
    expect(row.limits.custom_domain).toBe(0);
    expect(row.modules).toContain("crm");
  });

  it("prevents suspending the last active tenant administrator", async () => {
    const form = new FormData();
    form.set("role", "admin");
    form.set("status", "suspended");
    const blocked = await updateTenantMembership(tenantId, adminMembershipId, { ok:false, message:"" }, form);
    expect(blocked.ok).toBe(false);

    await pg.query("insert into tenant_memberships(tenant_id,user_id,role,status,permissions,activated_at) values($1,$2,'admin','active',$3,now())", [tenantId, secondAdminId, JSON.stringify({modules,clients:"all"})]);
    const allowed = await updateTenantMembership(tenantId, adminMembershipId, { ok:false, message:"" }, form);
    expect(allowed.ok).toBe(true);
    const row = (await pg.query<{status:string}>("select status from tenant_memberships where id=$1", [adminMembershipId])).rows[0];
    expect(row.status).toBe("suspended");
  });

  it("can suspend and reactivate a regular global user without deleting memberships", async () => {
    const suspend = new FormData();
    suspend.set("userId", agentUserId);
    suspend.set("active", "0");
    await setGlobalUserActive(suspend);
    expect((await pg.query<{active:boolean}>("select active from users where id=$1",[agentUserId])).rows[0].active).toBe(false);
    expect((await pg.query("select id from tenant_memberships where id=$1",[agentMembershipId])).rows).toHaveLength(1);

    const activate = new FormData();
    activate.set("userId", agentUserId);
    activate.set("active", "1");
    await setGlobalUserActive(activate);
    expect((await pg.query<{active:boolean}>("select active from users where id=$1",[agentUserId])).rows[0].active).toBe(true);
  });
});
