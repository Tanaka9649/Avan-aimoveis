import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { applyDrizzleMigrations } from "@/test/apply-drizzle-migrations";
const fixture = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/db", () => ({ getDb: () => fixture.db }));
import { resetPassword } from "./password-reset";
import { hashPassword, hashToken, verifyPassword } from "./security";
let pg: PGlite;
const tenant = "81000000-0000-4000-8000-000000000001";
const property = "81000000-0000-4000-8000-000000000002";
const user = "81000000-0000-4000-8000-000000000003";
beforeAll(async () => {
  pg = new PGlite(); await applyDrizzleMigrations(pg); fixture.db = drizzle(pg);
  await pg.query("INSERT INTO tenants(id,name,slug,status,plan) VALUES($1,'Audit test','audit-test','active','max')", [tenant]);
  await pg.query("INSERT INTO properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private,status,published_at) VALUES($1,$2,'TEST','Casa de teste','casa-teste','Casa',100,'Teste','MG','Frutal','Centro','Privado','disponivel',now())", [property,tenant]);
  await pg.query("INSERT INTO stages(tenant_id,name,position,color) VALUES($1,'Entrada',0,'#000')",[tenant]);
  await pg.query("INSERT INTO users(id,name,email,password_hash,role) VALUES($1,'Test','test@example.invalid',$2,'admin')",[user,await hashPassword('original-password')]);
},30000);
afterAll(async () => { await pg.close(); });
describe("audit database invariants", () => {
  it("reuses a contact and open opportunity across normalized lead submissions", async () => {
    const call = (phone: string) => pg.query<{ id: string }>("SELECT intake_property_lead($1,'Cliente',$2,'lead@example.invalid','Interesse') AS id",[property,phone]);
    const first=await call('(34) 99999-1122'); const repeat=await call('5534999991122');
    expect(first.rows[0].id).toBeTruthy(); expect(repeat.rows[0].id).toBe(first.rows[0].id);
    expect((await pg.query<{n:number}>("SELECT count(*)::int n FROM clients WHERE tenant_id=$1",[tenant])).rows[0].n).toBe(1);
  });
  it("rejects leads from suspended tenants without creating data", async () => {
    await pg.query("UPDATE tenants SET status='suspended' WHERE id=$1",[tenant]);
    expect((await pg.query<{id:null}>("SELECT intake_property_lead($1,'Outro','34999998888','other@example.invalid','') AS id",[property])).rows[0].id).toBeNull();
    await pg.query("UPDATE tenants SET status='active' WHERE id=$1",[tenant]);
  });
  it("enforces quota even for a direct SQL insert and rolls back the whole statement", async () => {
    await pg.query("UPDATE tenants SET quota_overrides='{\"max_clients\":1}' WHERE id=$1",[tenant]);
    await expect(pg.query("INSERT INTO clients(tenant_id,name,phone,origin) VALUES($1,'Blocked','34988887777','teste')",[tenant])).rejects.toThrow('tenant_quota_exceeded:max_clients');
    await pg.query("UPDATE tenants SET quota_overrides='{}' WHERE id=$1",[tenant]);
  });
  it("uses reset tokens once and revokes existing sessions", async () => {
    await pg.query("INSERT INTO password_resets(user_id,token_hash,password_version,expires_at) SELECT id,$2,password_hash,now()+interval '1 hour' FROM users WHERE id=$1",[user,hashToken('reset-test')]);
    await pg.query("INSERT INTO sessions(user_id,tenant_id,token_hash,expires_at) VALUES($1,$2,'session-test',now()+interval '1 day')",[user,tenant]);
    expect(await resetPassword('reset-test','changed-password')).toBe(true);
    expect(await resetPassword('reset-test','another-password')).toBe(false);
    const row=(await pg.query<{password_hash:string}>("SELECT password_hash FROM users WHERE id=$1",[user])).rows[0];
    expect(await verifyPassword('changed-password',row.password_hash)).toBe(true);
    expect((await pg.query<{n:number}>("SELECT count(*)::int n FROM sessions WHERE user_id=$1",[user])).rows[0].n).toBe(0);
  });
  it("delivers one panel reminder even if the cron runs twice", async () => {
    await pg.query("INSERT INTO tenant_memberships(tenant_id,user_id,role,status) VALUES($1,$2,'owner','active')",[tenant,user]);
    await pg.query("INSERT INTO visits(tenant_id,client_id,property_id,assigned_to,scheduled_at) SELECT $1,id,$2,$3,now()+interval '2 hours' FROM clients WHERE tenant_id=$1 LIMIT 1",[tenant,property,user]);
    await pg.query("SELECT enqueue_visit_reminders()");
    await pg.query("SELECT enqueue_visit_reminders()");
    expect((await pg.query<{n:number}>("SELECT count(*)::int n FROM notifications WHERE tenant_id=$1",[tenant])).rows[0].n).toBe(1);
    expect((await pg.query<{n:number}>("SELECT count(*)::int n FROM visit_reminder_deliveries WHERE tenant_id=$1",[tenant])).rows[0].n).toBe(1);
  });
  it("archives complete days, deduplicates nullable property keys and is safe to rerun", async () => {
    await pg.query("INSERT INTO analytics_events(tenant_id,event_type,anonymous_session_id,created_at) VALUES($1,'site_view','old-a',now()-interval '95 days'),($1,'site_view','old-b',now()-interval '95 days'),($1,'site_view','recent',now()-interval '1 day')",[tenant]);
    expect((await pg.query<{n:number}>("SELECT retain_analytics(90)::int n")).rows[0].n).toBe(2);
    expect((await pg.query<{n:number}>("SELECT retain_analytics(90)::int n")).rows[0].n).toBe(0);
    expect((await pg.query<{n:number}>("SELECT sum(total)::int n FROM analytics_daily WHERE tenant_id=$1",[tenant])).rows[0].n).toBe(3);
  });
});
