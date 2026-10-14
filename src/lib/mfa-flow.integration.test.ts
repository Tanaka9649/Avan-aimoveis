import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {generate} from "otplib";
import {applyDrizzleMigrations} from "@/test/apply-drizzle-migrations";
const fixture=vi.hoisted(()=>({db:null as unknown,token:"initial-synthetic-session",ip:"192.0.2.1",keys:[] as string[]}));
vi.mock("@/db",()=>({getDb:()=>fixture.db}));
vi.mock("next/headers",()=>({
 cookies:async()=>({get:(name:string)=>name==="avan_session"?{value:fixture.token}:undefined}),
 headers:async()=>new Headers({"host":"test.invalid","x-forwarded-for":fixture.ip,"x-platform-api":"1"}),
}));
vi.mock("@/lib/rate-limit",()=>({checkRateLimit:async(key:string)=>{fixture.keys.push(key);return true;}}));
import {POST as manage} from "@/app/api/auth/mfa/route";
import {POST as login} from "@/app/api/auth/login/route";
import {currentUser} from "./auth";
import {hashToken,hashPassword} from "./security";
const user="87000000-0000-4000-8000-000000000001",tenant="87000000-0000-4000-8000-000000000002";
const password="synthetic-only-password-12";
let pg:PGlite,secret:string,recovery:string[];
const request=(body:unknown)=>new Request("https://test.invalid/api/auth/mfa",{method:"POST",headers:{"content-type":"application/json",origin:"https://test.invalid"},body:JSON.stringify(body)});
const signIn=(code?:string)=>login(request({email:"flow@example.invalid",password,tenantSlug:"mfa-flow",code}));
beforeAll(async()=>{
 vi.stubEnv("MFA_ENCRYPTION_KEY",Buffer.alloc(32,9).toString("base64"));
 pg=new PGlite();await applyDrizzleMigrations(pg);fixture.db=drizzle(pg);
 await pg.query("insert into tenants(id,name,slug,status,plan) values($1,'MFA flow','mfa-flow','active','max')",[tenant]);
 await pg.query("insert into users(id,name,email,password_hash,role,global_role) values($1,'Synthetic admin','flow@example.invalid',$2,'admin','super_admin')",[user,await hashPassword(password)]);
 await pg.query("insert into tenant_memberships(tenant_id,user_id,role,status) values($1,$2,'owner','active')",[tenant,user]);
 await pg.query("insert into sessions(user_id,tenant_id,token_hash,expires_at) values($1,$2,$3,now()+interval '1 day')",[user,tenant,hashToken(fixture.token)]);
},30000);
afterAll(async()=>{vi.unstubAllEnvs();await pg.close();});
describe.sequential("Super Admin MFA lifecycle and login",()=>{
 it("preserves the existing session and requires password reauthentication",async()=>{
  expect(Boolean(await currentUser())).toBe(true);
  expect((await manage(request({action:"setup",password:"wrong-password"}))).status).toBe(403);
  const setup=await manage(request({action:"setup",password}));
  expect(setup.status).toBe(200);secret=(await setup.json()).secret;
  expect(Boolean(await currentUser())).toBe(true);
  expect((await pg.query("select * from user_mfa where enabled_at is not null")).rows).toHaveLength(0);
 });
 it("enables only with valid TOTP, returns codes once and revokes all earlier sessions",async()=>{
  expect((await manage(request({action:"enable",password,code:"invalid"}))).status).toBe(400);
  const response=await manage(request({action:"enable",password,code:await generate({secret})}));
  expect(response.status).toBe(200);const data=await response.json();recovery=data.recoveryCodes;expect(recovery).toHaveLength(8);
  expect((await pg.query("select * from sessions where user_id=$1",[user])).rows).toHaveLength(0);
  expect(await currentUser()).toBeNull();
 });
 it("never grants a password-only session after enrollment",async()=>{
  const denied=await signIn();
  expect(denied.status).toBe(401);expect((await denied.json()).mfaRequired).toBe(true);
  expect((await pg.query("select * from sessions where user_id=$1",[user])).rows).toHaveLength(0);
 });
 it("accepts recovery once, creates an assured session, and preserves credentials and privileges",async()=>{
  const accepted=await signIn(recovery[0]);expect(accepted.status).toBe(200);
  const cookie=accepted.headers.get("set-cookie")!.match(/avan_session=([^;]+)/)!;fixture.token=cookie[1];
  expect(Boolean(await currentUser())).toBe(true);
  expect((await signIn(recovery[0])).status).toBe(401);
  const account=(await pg.query<{global_role:string;active:boolean}>("select global_role,active from users where id=$1",[user])).rows[0];
  expect(account).toEqual({global_role:"super_admin",active:true});
 });
 it("binds account throttling to source, without a globally blockable email bucket",async()=>{
  fixture.keys=[];fixture.ip="192.0.2.2";await signIn();
  expect(fixture.keys.some(key=>key.startsWith("login-account-ip:192.0.2.2:"))).toBe(true);
  expect(fixture.keys.some(key=>key==="login-email:flow@example.invalid")).toBe(false);
 });
 it("requires reauthentication plus second factor to disable and ends sessions",async()=>{
  const disabled=await manage(request({action:"disable",password,code:recovery[1]}));
  expect(disabled.status).toBe(200);
  expect((await pg.query("select * from user_mfa where user_id=$1",[user])).rows).toHaveLength(0);
  expect(await currentUser()).toBeNull();
  expect((await signIn()).status).toBe(200);
 });
});
