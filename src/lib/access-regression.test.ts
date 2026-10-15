import { beforeEach, describe, expect, it, vi } from "vitest";
const state=vi.hoisted(() => ({ role:"viewer", module:true, api:false }));
vi.mock("@/lib/auth",()=>({ requireUser:async()=>({ membershipRole:state.role,globalRole:"user",role:"equipe",tenantId:"tenant",access:{modules:["imoveis","crm","visitas","propostas"],clients:"all"} }) }));
vi.mock("@/lib/entitlements",()=>({canUseModule:async()=>state.module}));
vi.mock("next/headers",()=>({headers:async()=>new Headers(state.api?{"x-platform-api":"1"}:{})}));
vi.mock("next/navigation",()=>({notFound:()=>{throw new Error("not-found");}}));
import { saveProperty, publishProperty, unpublishProperty, duplicateProperty } from "@/app/painel/imoveis/actions";
import { POST as uploadPhoto } from "@/app/api/properties/[id]/photos/route";
import { PATCH as editPhoto, DELETE as deletePhoto } from "@/app/api/properties/[id]/photos/[photoId]/route";
import { POST as uploadDocument } from "@/app/api/properties/[id]/documents/route";
import { requireSuperAdmin, requireModule,requireWriteModule } from "./access";
import { moveOpportunity } from "@/app/painel/crm/move";
import { saveProposal, saveSale } from "@/app/painel/propostas/actions";
import { updateVisit } from "@/app/painel/visitas/actions";
import { withApiErrors } from "./api-errors";
beforeEach(()=>{state.role="viewer";state.module=true;state.api=false;});
describe("real permission guards",()=>{
 it("denies property create/edit/publish/unpublish/duplicate at the actual server actions", async()=>{
  await expect(saveProperty({error:""},new FormData())).rejects.toThrow("not-found");
  await expect(publishProperty("test")).rejects.toThrow("not-found");
  await expect(unpublishProperty("test")).rejects.toThrow("not-found");
  await expect(duplicateProperty(new FormData())).rejects.toThrow("not-found");
 });
 it("denies photo upload, cover/reorder, deletion and document upload with HTTP 403",async()=>{
  state.api=true;
  const request=new Request("https://example.invalid/api/properties/test/photos",{method:"POST"});
  const context={params:Promise.resolve({id:"test",photoId:"test"})};
  for(const handler of [uploadPhoto,editPhoto,deletePhoto,uploadDocument]) expect((await handler(request,context)).status).toBe(403);
 });
 it("never grants Super Admin to tenant admins",async()=>{state.role="admin";await expect(requireSuperAdmin()).rejects.toThrow("not-found");});
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
