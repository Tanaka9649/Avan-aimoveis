import {afterAll,beforeAll,describe,expect,it,vi} from "vitest";
import {readFileSync,writeFileSync,mkdirSync} from "node:fs";
import {resolve} from "node:path";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {applyDrizzleMigrations} from "@/test/apply-drizzle-migrations";
const state=vi.hoisted(()=>({db:null as unknown,images:new Map<string,Uint8Array>()}));
vi.mock("@/db",()=>({getDb:()=>state.db}));
vi.mock("@/lib/auth",()=>({currentUser:async()=>null}));
vi.mock("@/lib/rate-limit",()=>({checkRateLimit:async()=>true}));
vi.mock("@/lib/storage",()=>({PHOTO_BUCKET:"readonly-audit",storageClient:()=>({send:async(command:{input:{Key:string}})=>({Body:{transformToByteArray:async()=>state.images.get(command.input.Key)!}})})}));
import {GET} from "@/app/api/properties/[id]/pdf/route";
import {pdfText} from "@/lib/property-pdf";

type Row={id:string;tenant_id:string;tenant_name:string;code:string;title:string;slug:string;type:string;price_cents:number;description:string;city:string;neighborhood:string;state:string;private_area:string|null;lot_area:string|null;bedrooms:number;bathrooms:number;parking_spaces:number;photo_id:string};
const filename=process.env.PDF_AUDIT_FIXTURE;
const rows:Row[]=filename?JSON.parse(readFileSync(filename,"utf8")):[];
const output=resolve("test-results/pdf-audit");
let pg:PGlite;
describe.skipIf(!filename)("READ-ONLY real Avança properties through the corrected LOCAL route",()=>{
 beforeAll(async()=>{
  pg=new PGlite();await applyDrizzleMigrations(pg);state.db=drizzle(pg);
  mkdirSync(output,{recursive:true});
  for(const row of rows){
   await pg.query("insert into tenants(id,name,slug,status,plan) values($1,$2,'audit-real-data','active','max') on conflict(id) do update set name=excluded.name,status='active'",[row.tenant_id,row.tenant_name]);
   await pg.query("insert into properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private,private_area,lot_area,bedrooms,bathrooms,parking_spaces,status,published_at) values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'not-copied',$12,$13,$14,$15,$16,'disponivel',now())",[row.id,row.tenant_id,row.code,row.title,row.slug,row.type,row.price_cents,row.description,row.state,row.city,row.neighborhood,row.private_area,row.lot_area,row.bedrooms,row.bathrooms,row.parking_spaces]);
   const response=await fetch(`https://imoveisplatform.vercel.app/api/property-photos/${row.photo_id}?v=medium`,{signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error("Public cover unavailable: "+response.status);
   state.images.set(row.photo_id,new Uint8Array(await response.arrayBuffer()));
   await pg.query("insert into property_photos(tenant_id,property_id,storage_path,alt,position,is_cover,processing_status) values($1,$2,$3,'Public cover',0,true,'ready')",[row.tenant_id,row.id,row.photo_id]);
  }
 },150000);
 afterAll(async()=>{await pg?.close();});
 it("reproduces legacy Helvetica failure with actual saved descriptions",async()=>{
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.Helvetica);
  const unsupported=rows.filter(row=>{try{font.encodeText(row.description);return false;}catch{return true;}});
  expect(rows).toHaveLength(8);expect(unsupported.length).toBeGreaterThan(0);
 });
 for(const row of rows)it(row.slug+": 200, valid PDF, cover and unchanged source",async()=>{
  const response=await GET(new Request(`https://audit.invalid/api/properties/${row.id}/pdf`),{params:Promise.resolve({id:row.id})});
  expect(response.status).toBe(200);expect(response.headers.get("content-type")).toBe("application/pdf");
  const bytes=new Uint8Array(await response.arrayBuffer());
  expect(Buffer.from(bytes).subarray(0,5).toString()).toBe("%PDF-");
  const doc=await PDFDocument.load(bytes);expect(doc.getPageCount()).toBeGreaterThan(0);
  expect(bytes.length).toBeGreaterThan(10000);
  expect((await pg.query<{description:string}>("select description from properties where id=$1",[row.id])).rows[0].description).toBe(row.description);
  writeFileSync(resolve(output,row.slug+".pdf"),bytes);
  const font=await doc.embedFont(StandardFonts.Helvetica);
  writeFileSync(resolve(output,row.slug+".expected.txt"),pdfText(row.description,font));
 },30000);
});
