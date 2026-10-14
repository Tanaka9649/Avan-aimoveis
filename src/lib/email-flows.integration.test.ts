import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {PgDialect} from "drizzle-orm/pg-core";
import type {SQL} from "drizzle-orm";
import {applyDrizzleMigrations} from "@/test/apply-drizzle-migrations";
const state=vi.hoisted(()=>({db:null as unknown,transport:vi.fn()}));
vi.mock("@/db",()=>({getDb:()=>state.db}));
vi.mock("@/lib/rate-limit",()=>({checkRateLimit:async()=>true}));
import {createTenantInvitation} from "./invitations";
import {sendEmail} from "./email";
import {hashPassword} from "./security";
import {POST as requestReset} from "@/app/api/auth/password-reset/route";
import {GET as queue} from "@/app/api/cron/visit-reminders/route";
import {GET as deliver} from "@/app/api/cron/visit-reminder-emails/route";
const tenant="89000000-0000-4000-8000-000000000001",user="89000000-0000-4000-8000-000000000002",property="89000000-0000-4000-8000-000000000003";
let pg:PGlite;
const cron=()=>new Request("https://synthetic.invalid/api/cron/test",{headers:{authorization:"Bearer synthetic-only-cron"}});
const reset=(email="mail@example.invalid")=>requestReset(new Request("https://synthetic.invalid/api/auth/password-reset",{method:"POST",body:JSON.stringify({email,tenantSlug:"synthetic-email"})}));
beforeAll(async()=>{
 vi.stubGlobal("fetch",state.transport);
 vi.stubEnv("CRON_SECRET","synthetic-only-cron");vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("VERCEL_URL","synthetic-preview.vercel.app");
 pg=new PGlite();await applyDrizzleMigrations(pg);const db=drizzle(pg);
 state.db=Object.assign(db,{
  execute:(query:SQL)=>{const built=new PgDialect().sqlToQuery(query);return {toSQL:()=>built,then:(resolve:(value:unknown)=>unknown,reject:(reason:unknown)=>unknown)=>pg.query(built.sql,built.params).then(resolve,reject)};},
  batch:async(queries:{toSQL:()=>{sql:string;params:unknown[]}}[])=>pg.transaction(async tx=>{const result=[];for(const query of queries){const built=query.toSQL();result.push(await tx.query(built.sql,built.params));}return result;}),
 });
 await pg.query("insert into tenants(id,name,slug,status,plan) values($1,'Synthetic email','synthetic-email','active','max')",[tenant]);
 await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Synthetic','mail@example.invalid',$2,'admin')",[user,await hashPassword("synthetic-password-only")]);
 await pg.query("insert into tenant_memberships(tenant_id,user_id,role,status) values($1,$2,'owner','active')",[tenant,user]);
 await pg.query("insert into clients(tenant_id,name,phone,origin) values($1,'Synthetic contact','11999990001','test')",[tenant]);
 await pg.query("insert into properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private) values($1,$2,'MAIL','Synthetic','mail','Casa',100,'Test','MG','Test','Test','Test')",[property,tenant]);
 await pg.query("insert into visits(tenant_id,client_id,property_id,assigned_to,scheduled_at) select $1,id,$2,$3,now()+interval '3 hours' from clients where tenant_id=$1",[tenant,property,user]);
 await pg.query("insert into reminder_settings(tenant_id,key,panel,email,recipients) values($1,'visits',true,true,'[\"mail@example.invalid\"]')",[tenant]);
},30000);
beforeEach(()=>{state.transport.mockReset().mockResolvedValue(new Response("{}",{status:200}));vi.stubEnv("RESEND_API_KEY","synthetic-not-a-real-key");vi.stubEnv("AUTH_EMAIL_FROM","Audit <audit@example.invalid>");});
afterAll(async()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();await pg.close();});
describe.sequential("email flows with transport fully simulated",()=>{
 it("never attempts transport without configuration",async()=>{vi.stubEnv("RESEND_API_KEY","");expect(await sendEmail({to:"x@example.invalid",subject:"Test",text:"Test",key:"test"})).toBe(false);expect(state.transport).not.toHaveBeenCalled();});
 it("prepares a tenant invitation with Preview link and idempotency key",async()=>{
  const result=await createTenantInvitation({tenantId:tenant,invitedBy:user,name:"Synthetic invited",email:"invited@example.invalid",role:"viewer"});
  expect(result.emailSent).toBe(true);expect(result.inviteUrl).toMatch(/^https:\/\/synthetic-preview.vercel.app\/convite\//);
  const [url,init]=state.transport.mock.calls[0];expect(url).toBe("https://api.resend.com/emails");
  expect(init.headers["Idempotency-Key"]).toMatch(/^invite\//);expect(JSON.parse(init.body).text).toContain(result.inviteUrl);
  expect((await pg.query("select id from tenant_invites where tenant_id=$1 and role='viewer'",[tenant])).rows).toHaveLength(1);
 });
 it("prepares recovery only for active accounts without enumeration",async()=>{
  const existing=await reset();expect(existing.status).toBe(200);const body=await existing.json();
  expect(state.transport).toHaveBeenCalledTimes(1);expect(JSON.parse(state.transport.mock.calls[0][1].body).text).toContain("https://synthetic-preview.vercel.app/redefinir-senha?empresa=synthetic-email#");
  expect((await pg.query("select id from password_resets where user_id=$1",[user])).rows).toHaveLength(1);
  const missing=await reset("missing@example.invalid");expect(await missing.json()).toEqual(body);expect(state.transport).toHaveBeenCalledTimes(1);
 });
 it("queues panel notifications once and never sends from the queue job",async()=>{
  expect((await queue(cron())).status).toBe(200);expect((await queue(cron())).status).toBe(200);
  expect(state.transport).not.toHaveBeenCalled();expect((await pg.query("select id from notifications where tenant_id=$1",[tenant])).rows).toHaveLength(1);
 });
 it("delivers the queued email once across repeated authenticated runs",async()=>{
  expect((await deliver(cron())).status).toBe(200);expect((await deliver(cron())).status).toBe(200);
  expect(state.transport).toHaveBeenCalledTimes(1);expect(state.transport.mock.calls[0][1].headers["Idempotency-Key"]).toMatch(/^visit-reminder\//);
  expect((await pg.query("select id from visit_reminder_deliveries where tenant_id=$1 and sent_at is null",[tenant])).rows).toHaveLength(0);
 });
 it("keeps failed deliveries pending with a lease, and records a sanitized failure",async()=>{
  await pg.query("update visit_reminder_deliveries set sent_at=null,lease_until=null where tenant_id=$1 and recipient not like 'panel:%'",[tenant]);
  state.transport.mockResolvedValue(new Response("sensitive provider detail must not be logged",{status:503}));
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  try {expect((await deliver(cron())).status).toBe(503);expect((await deliver(cron())).status).toBe(200);expect(state.transport).toHaveBeenCalledTimes(1);expect(JSON.stringify(log.mock.calls)).not.toContain("sensitive provider detail");}finally{log.mockRestore();}
  expect((await pg.query("select id from visit_reminder_deliveries where tenant_id=$1 and sent_at is null and lease_until>now()",[tenant])).rows).toHaveLength(1);
  expect((await pg.query("select id from operation_run_events where status='failed' and code='transport_failed'")).rows).toHaveLength(1);
 });
 it("records skipped rather than failure when email is intentionally unconfigured",async()=>{
  vi.stubEnv("RESEND_API_KEY","");expect(await (await deliver(cron())).json()).toEqual({status:"skipped",reason:"email_not_configured"});expect(state.transport).not.toHaveBeenCalled();
  expect((await pg.query<{status:string}>("select status from operation_runs where name='visit-reminder-emails'")).rows[0].status).toBe("skipped");
 });
});
