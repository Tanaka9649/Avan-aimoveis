import {afterAll,beforeAll,describe,expect,it} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {applyDrizzleMigrations} from "@/test/apply-drizzle-migrations";
import {previewFixtureQueries} from "@/test/preview-fixture";
import {hashPassword} from "./security";
let pg:PGlite;
beforeAll(async()=>{pg=new PGlite();await applyDrizzleMigrations(pg);},30000);
afterAll(async()=>pg.close());
async function seed(){const queries=previewFixtureQueries(await hashPassword("synthetic-not-used-externally"));await pg.transaction(async tx=>{for(const query of queries)await tx.query(query.text,query.params);});}
describe.sequential("isolated Preview fixture",()=>{
 it("creates only synthetic companies and accounts with no real messages",async()=>{await seed();expect((await pg.query("select id from users where email like '%@example.invalid'")).rows).toHaveLength(6);expect((await pg.query("select id from tenants where slug like 'audit-synthetic-%'")).rows).toHaveLength(2);expect((await pg.query("select tenant_id from reminder_settings where email=true")).rows).toHaveLength(0);});
 it("refuses any populated database rather than modifying accounts or rerunning",async()=>{await expect(seed()).rejects.toThrow("preview_fixture_requires_empty_database");expect((await pg.query("select id from users")).rows).toHaveLength(6);});
});
