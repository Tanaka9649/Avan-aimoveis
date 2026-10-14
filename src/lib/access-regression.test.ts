import { beforeEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(() => ({ role:"viewer", module:true, api:false }));
vi.mock("@/lib/auth",()=>({ requireUser:async()=>({ membershipRole:state.role,globalRole:"user",role:"equipe",tenantId:"tenant",access:{modules:["imoveis","crm","visitas","propostas"],clients:"all"} }) }));
vi.mock("@/lib/entitlements",()=>({canUseModule:async()=>state.module}));
vi.mock("next/headers",()=>({headers:async()=>new Headers(state.api?{"x-platform-api":"1"}:{})}));
vi.mock("next/navigation",()=>({notFound:()=>{throw new Error("not-found");}}));
import { requireModule,requireWriteModule } from "./access";
import { moveOpportunity } from "@/app/painel/crm/move";
import { saveProposal, saveSale } from "@/app/painel/propostas/actions";
import { updateVisit } from "@/app/painel/visitas/actions";
import { withApiErrors } from "./api-errors";
beforeEach(()=>{state.role="viewer";state.module=true;state.api=false;});
describe("real permission guards",()=>{
 it("denies commercial and visit mutations for read-only sessions",async()=>{
  await expect(saveProposal({ok:false,message:""},new FormData())).rejects.toThrow("not-found");
  await expect(saveSale({ok:false,message:""},new FormData())).rejects.toThrow("not-found");
  await expect(updateVisit(new FormData())).rejects.toThrow("not-found");
 });
 it("denies Kanban mutation before touching the database for read-only users",async()=>{await expect(moveOpportunity({id:"bad",stageId:"bad",beforeId:null,fromStageId:"bad"})).rejects.toThrow("not-found");});
 it("lets viewer read but not mutate",async()=>{await expect(requireModule("imoveis")).resolves.toBeTruthy();await expect(requireWriteModule("imoveis")).rejects.toThrow("not-found");});
 it("blocks an agent when the tenant's module is disabled",async()=>{state.role="agent";state.module=false;await expect(requireWriteModule("imoveis")).rejects.toThrow("not-found");});
 it("returns JSON 403 at API boundary",async()=>{state.api=true;const handler=withApiErrors(async()=>{await requireWriteModule("imoveis");return new Response();});const response=await handler();expect(response.status).toBe(403);expect(response.headers.get("content-type")).toContain("application/json");});
});
