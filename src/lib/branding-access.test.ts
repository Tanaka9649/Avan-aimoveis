import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({admin:vi.fn(),superadmin:vi.fn(),select:vi.fn()}));
vi.mock("./access",()=>({requireAdmin:mock.admin,requireSuperAdmin:mock.superadmin}));
vi.mock("@/db",()=>({getDb:()=>({select:mock.select})}));
import { brandingActor } from "./branding-access";
import { ApiAccessError } from "./api-errors";
beforeEach(()=>vi.resetAllMocks());
describe("branding target authorization",()=>{
 it("uses current membership for ordinary admin uploads",async()=>{
  mock.admin.mockResolvedValue({tenantId:"a"});
  expect(await brandingActor(new Request("https://example.invalid/api/branding"))).toEqual({tenantId:"a"});
  expect(mock.superadmin).not.toHaveBeenCalled();
 });
 it("rejects tenant targeting before any database lookup for a non-superadmin",async()=>{
  mock.superadmin.mockRejectedValue(new ApiAccessError(403));
  await expect(brandingActor(new Request("https://example.invalid/api/branding?tenantId=00000000-0000-4000-8000-000000000002"))).rejects.toMatchObject({status:403});
  expect(mock.select).not.toHaveBeenCalled();
 });
 it("uses the explicitly authorized target instead of the superadmin's current tenant",async()=>{
  const target="00000000-0000-4000-8000-000000000002";
  mock.superadmin.mockResolvedValue({id:"operator",tenantId:"tenant-a"});
  mock.select.mockReturnValue({from:()=>({where:()=>({limit:async()=>[{id:target}]})})});
  expect(await brandingActor(new Request("https://example.invalid/api/branding?tenantId="+target))).toEqual({id:"operator",tenantId:target});
 });
});
