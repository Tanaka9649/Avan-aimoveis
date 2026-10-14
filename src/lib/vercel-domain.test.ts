import {afterEach,beforeEach,describe,expect,it,vi} from "vitest";
import {verifyProjectDomain} from "./vercel-domain";
const fetcher=vi.fn();
beforeEach(()=>{vi.stubGlobal("fetch",fetcher);vi.stubEnv("VERCEL_API_TOKEN","synthetic");vi.stubEnv("VERCEL_PROJECT_ID","project-test");vi.stubEnv("VERCEL_TEAM_ID","team-test");});
afterEach(()=>{vi.unstubAllGlobals();vi.unstubAllEnvs();fetcher.mockReset();});
const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status});
describe("domain ownership plus DNS evidence",()=>{
 it("does not activate a verified domain when DNS is misconfigured",async()=>{
  fetcher.mockResolvedValueOnce(reply({name:"test.example",verified:true})).mockResolvedValueOnce(reply({misconfigured:true}));
  expect((await verifyProjectDomain("test.example")).active).toBe(false);
 });
 it("requires positive DNS confirmation, not an absent field",async()=>{
  fetcher.mockResolvedValueOnce(reply({name:"test.example",verified:true})).mockResolvedValueOnce(reply({}));
  expect((await verifyProjectDomain("test.example")).active).toBe(false);
 });
 it("activates only the domain bound to this project with verified ownership and DNS",async()=>{
  fetcher.mockResolvedValueOnce(reply({name:"test.example",verified:true})).mockResolvedValueOnce(reply({misconfigured:false}));
  expect((await verifyProjectDomain("test.example")).active).toBe(true);
  const url=fetcher.mock.calls[1][0] as URL;
  expect(url.searchParams.get("projectIdOrName")).toBe("project-test");
  expect(url.searchParams.get("teamId")).toBe("team-test");
 });
 it("never reassigns a domain belonging to another project",async()=>{
  fetcher.mockResolvedValueOnce(reply({},404)).mockResolvedValueOnce(reply({error:{code:"domain_already_in_use"}},409));
  await expect(verifyProjectDomain("test.example")).rejects.toThrow("domain_not_attached");
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
 it("rejects mismatched provider evidence",async()=>{
  fetcher.mockResolvedValueOnce(reply({name:"other.example",verified:true}));
  await expect(verifyProjectDomain("test.example")).rejects.toThrow("domain_mismatch");
 });
});
