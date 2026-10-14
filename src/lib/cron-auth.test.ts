import {afterEach,describe,expect,it,vi} from "vitest";
import {cronAuthorized} from "./cron-auth";
import {GET as panel} from "@/app/api/cron/visit-reminders/route";
import {GET as cleanup} from "@/app/api/cron/upload-cleanup/route";
import {GET as analytics} from "@/app/api/cron/analytics-retention/route";
afterEach(()=>vi.unstubAllEnvs());
describe("cron authentication",()=>{
 it("fails closed without configured secret",()=>{vi.stubEnv("CRON_SECRET","");expect(cronAuthorized(new Request("https://test.invalid"))).toBe(false);});
 it("accepts only the exact bearer value",()=>{vi.stubEnv("CRON_SECRET","synthetic-cron-secret");expect(cronAuthorized(new Request("https://test.invalid",{headers:{authorization:"Bearer synthetic-cron-secret"}}))).toBe(true);expect(cronAuthorized(new Request("https://test.invalid",{headers:{authorization:"Bearer wrong"}}))).toBe(false);});
 it("rejects jobs before touching the database",async()=>{vi.stubEnv("CRON_SECRET","synthetic");for(const route of [panel,cleanup,analytics])expect((await route(new Request("https://test.invalid"))).status).toBe(401);});
});
