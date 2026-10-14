import {afterAll,afterEach,beforeAll,describe,expect,it,vi} from "vitest";
import {randomUUID} from "node:crypto";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {applyDrizzleMigrations} from "@/test/apply-drizzle-migrations";
const fixture=vi.hoisted(()=>({db:null as unknown,send:vi.fn()}));
vi.mock("@/db",()=>({getDb:()=>fixture.db}));
vi.mock("@/lib/storage",()=>({PHOTO_BUCKET:"photos-test",DOCUMENT_BUCKET:"docs-test",storageClient:()=>({send:fixture.send})}));
import {claimUpload,cleanupAbandonedUploads,expiredUploadObjects,releaseUpload} from "./upload-lifecycle";
let pg:PGlite;
const tenant="86000000-0000-4000-8000-000000000001";
const property="86000000-0000-4000-8000-000000000002";
beforeAll(async()=>{
 pg=new PGlite();await applyDrizzleMigrations(pg);fixture.db=drizzle(pg);
 await pg.query("insert into tenants(id,name,slug,status,plan) values($1,'Synthetic uploads','synthetic-uploads','active','max')",[tenant]);
 await pg.query("insert into properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private) values($1,$2,'TEST','Test','test','Casa',100,'Test','MG','Test','Test','Test')",[property,tenant]);
},30000);
afterAll(async()=>{await pg.close();});
afterEach(async()=>{
 await pg.query("delete from branding_assets where tenant_id=$1",[tenant]);
 await pg.query("delete from property_photos where tenant_id=$1",[tenant]);
 await pg.query("update tenants set quota_overrides='{}' where id=$1",[tenant]);
 fixture.send.mockReset();
});
async function brand(age=25,confirmed=false){
 const id=randomUUID();
 await pg.query("insert into branding_assets(id,tenant_id,asset,mime,size_bytes,created_at,confirmed_at) values($1,$2,$3,'image/png',30,now()-make_interval(hours=>$4),case when $5 then now() end)",[id,tenant,id+".png",age,confirmed]);
 return id;
}
describe("upload lifecycle on real PostgreSQL semantics",()=>{
 it("excludes recent and ready files, deletes expired objects before freeing quota, and is idempotent",async()=>{
  await brand();await brand(1);await brand(30,true);
  fixture.send.mockResolvedValue({});
  expect(await cleanupAbandonedUploads()).toEqual({removed:1,failed:0});
  expect(fixture.send).toHaveBeenCalledTimes(2);
  expect((await pg.query("select * from branding_assets")).rows).toHaveLength(2);
  expect(await cleanupAbandonedUploads()).toEqual({removed:0,failed:0});
 });
 it("serializes completion and excludes a live lease even after TTL",async()=>{
  const id=await brand(1);
  const claims=await Promise.all([claimUpload("branding_assets",tenant,id),claimUpload("branding_assets",tenant,id)]);
  expect(claims.filter(Boolean)).toHaveLength(1);
  await pg.query("update branding_assets set created_at=now()-interval '25 hours' where id=$1",[id]);
  expect(await cleanupAbandonedUploads()).toEqual({removed:0,failed:0});
  await releaseUpload("branding_assets",tenant,id);
  expect(await claimUpload("branding_assets",tenant,id)).toBe(false);
  fixture.send.mockResolvedValue({});
  expect(await cleanupAbandonedUploads()).toEqual({removed:1,failed:0});
 });
 it("keeps failed deletions charged, blocks resurrection, and retries safely",async()=>{
  const id=await brand();
  fixture.send.mockRejectedValue(new Error("synthetic storage failure"));
  const log=vi.spyOn(console,"error").mockImplementation(()=>{});
  expect(await cleanupAbandonedUploads()).toEqual({removed:0,failed:1});
  expect((await pg.query<{n:number}>("select sum(size_bytes)::int n from branding_assets")).rows[0].n).toBe(30);
  expect(await claimUpload("branding_assets",tenant,id)).toBe(false);
  await pg.query("update branding_assets set upload_lease_until=now()-interval '1 second'");
  fixture.send.mockResolvedValue({});
  expect(await cleanupAbandonedUploads()).toEqual({removed:1,failed:0});
  log.mockRestore();
 });
 it("refuses legacy and cross-tenant object paths",()=>{
  expect(()=>expiredUploadObjects("property_documents",{id:"x",tenant_id:tenant,property_id:property,storage_path:"shared/private.pdf"})).toThrow("unsafe_upload_key");
  expect(()=>expiredUploadObjects("property_photos",{id:"x",tenant_id:tenant,property_id:property,storage_path:`tenants/${tenant}/properties/${property}/photos/x-original.jpg`,variants:{full:"tenants/other/x"}})).toThrow("unsafe_upload_key");
 });
 it("enforces reserved storage capacity for simultaneous requests",async()=>{
  await pg.query("update tenants set quota_overrides='{\"max_storage_bytes\":50}' where id=$1",[tenant]);
  const results=await Promise.allSettled([brand(1),brand(1)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  expect((await pg.query<{n:number}>("select sum(size_bytes)::int n from branding_assets")).rows[0].n).toBe(30);
 });
 it("keeps the ten-photo rule atomic including pending reservations",async()=>{
  const insert=async()=>{
   const id=randomUUID();
   return pg.query("insert into property_photos(id,tenant_id,property_id,storage_path,alt,position,processing_status,size_bytes) values($1,$2,$3,$4,'test',1,'uploading',1)",[id,tenant,property,`tenants/${tenant}/properties/${property}/photos/${id}-original.jpg`]);
  };
  const results=await Promise.allSettled(Array.from({length:11},insert));
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(10);
  expect((await pg.query<{n:number}>("select count(*)::int n from property_photos")).rows[0].n).toBe(10);
 });
});
