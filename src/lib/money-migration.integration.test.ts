import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { drizzle } from "drizzle-orm/pglite";
import { properties } from "@/db/schema";
import { eq, gte, and } from "drizzle-orm";
const tenant = "00000000-0000-4000-8000-000000000001";
const id = "80000000-0000-4000-8000-000000000015";
let pg: PGlite;
beforeAll(async () => {
  pg = new PGlite();
  for (const file of readdirSync("drizzle").filter(f=>f.endsWith(".sql") && f < "0022").sort()) await pg.exec(readFileSync(`drizzle/${file}`,"utf8"));
  await pg.query("insert into properties(id,tenant_id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private,status,published_at) values($1,$2,'QA15-OLD','Original synthetic property','qa15-old','Casa',79990050,'Preserve this record','MG','Frutal','Centro','Synthetic address','disponivel',now())",[id,tenant]);
},30000);
afterAll(async()=>{await pg.close();});
describe.sequential("0022 monetary migration on existing data",()=>{
  it("preserves existing cent values, publication and row identities",async()=>{
    const before=(await pg.query("select * from properties where id=$1",[id])).rows[0];
    await pg.exec(readFileSync("drizzle/0022_expand_property_money.sql","utf8"));
    const after=(await pg.query<Record<string,unknown>>("select * from properties where id=$1",[id])).rows[0];
    expect({...after,price_cents:Number(after.price_cents)}).toEqual(before);
    const columns=await pg.query<{data_type:string}>("select data_type from information_schema.columns where table_schema='public' and column_name like '%cents'");
    expect(columns.rows).toHaveLength(12);
    expect(columns.rows.every(c=>c.data_type==='bigint')).toBe(true);
  });
  it("persists and queries 350 million reais with exact cents through the ORM",async()=>{
    const db=drizzle(pg);
    await db.update(properties).set({priceCents:35000000057,type:"Fazenda"}).where(eq(properties.id,id));
    const rows=await db.select({price:properties.priceCents,type:properties.type}).from(properties).where(and(eq(properties.id,id),gte(properties.priceCents,35000000056)));
    expect(rows).toEqual([{price:35000000057,type:"Fazenda"}]);
    expect(JSON.stringify(rows)).toContain('35000000057');
  });
  it("public lead intake carries the large price into CRM without overflow",async()=>{
    await pg.query("insert into stages(tenant_id,name,position,color) values($1,'QA15 entry',0,'#000') on conflict do nothing",[tenant]);
    const lead=await pg.query<{id:string}>("select intake_property_lead($1,'AUDIT QA15 lead','11999991515','qa15@example.invalid','Synthetic migration test') id",[id]);
    expect(lead.rows[0].id).toBeTruthy();
    const deals=await pg.query<{estimated_value_cents:string}>("select estimated_value_cents::text from deals where tenant_id=$1",[tenant]);
    expect(deals.rows.some(d=>d.estimated_value_cents==='35000000057')).toBe(true);
  });
});
