import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { generate } from "otplib";
import { applyDrizzleMigrations } from "@/test/apply-drizzle-migrations";
const fixture=vi.hoisted(()=>({db:null as unknown}));
vi.mock("@/db",()=>({getDb:()=>fixture.db}));
import { consumeMfa, enabledMfa } from "./mfa";
import { decryptMfaSecret, encryptMfaSecret, newMfaEnrollment, newRecoveryCodes, verifyMfaTotp } from "./mfa-crypto";
let pg:PGlite;
const user="85000000-0000-4000-8000-000000000001";
beforeAll(async()=>{
 vi.stubEnv("MFA_ENCRYPTION_KEY",Buffer.alloc(32,7).toString("base64"));
 pg=new PGlite();await applyDrizzleMigrations(pg);fixture.db=drizzle(pg);
 await pg.query("insert into users(id,name,email,password_hash,role,global_role) values($1,'Synthetic MFA','mfa@example.invalid','unused','admin','super_admin')",[user]);
},30000);
afterAll(async()=>{vi.unstubAllEnvs();await pg.close();});
describe.sequential("MFA opt-in and replay protection",()=>{
 it("does not enable MFA for an existing account automatically",async()=>{expect(await enabledMfa(user)).toBeNull();});
 it("encrypts secrets with integrity and account binding",()=>{
  const encrypted=encryptMfaSecret("test-secret",user);
  expect(encrypted).not.toContain("test-secret");expect(decryptMfaSecret(encrypted,user)).toBe("test-secret");
  expect(()=>decryptMfaSecret(encrypted,"other-user")).toThrow();
  expect(()=>decryptMfaSecret(encrypted.slice(0,-4)+"AAAA",user)).toThrow();
 });
 it("verifies time windows and rejects reused time steps",async()=>{
  const enrollment=newMfaEnrollment(user,"mfa@example.invalid"),epoch=1791890000;
  const token=await generate({secret:enrollment.secret,epoch});
  const step=await verifyMfaTotp(enrollment.secret,token,null,epoch);
  expect(step).toBeTypeOf("number");expect(await verifyMfaTotp(enrollment.secret,token,step,epoch)).toBeNull();
  expect(await verifyMfaTotp(enrollment.secret,token,null,epoch+120)).toBeNull();
 });
 it("consumes TOTP and recovery codes once with atomic database updates",async()=>{
  const enrollment=newMfaEnrollment(user,"mfa@example.invalid"),recovery=newRecoveryCodes(user);
  await pg.query("insert into user_mfa(user_id,encrypted_secret,enabled_at,recovery_hashes) values($1,$2,now(),$3)",[user,enrollment.encrypted,JSON.stringify(recovery.hashes)]);
  const token=await generate({secret:enrollment.secret});
  const results=await Promise.all([consumeMfa(user,token),consumeMfa(user,token)]);
  expect(results.filter(Boolean)).toHaveLength(1);
  expect(await consumeMfa(user,recovery.codes[0])).toBe(true);
  expect(await consumeMfa(user,recovery.codes[0])).toBe(false);
  expect(await consumeMfa(user,"invalid")).toBe(false);
  expect(JSON.stringify((await pg.query("select * from user_mfa")).rows)).not.toContain(recovery.codes[0]);
 });
});
