import {beforeEach,describe,expect,it,vi} from "vitest";
const state=vi.hoisted(()=>({photo:null as Record<string,unknown>|null,user:null as unknown,send:vi.fn()}));
vi.mock("@/db",()=>({getDb:()=>{const query={select:()=>query,from:()=>query,innerJoin:()=>query,where:()=>query,limit:async()=>state.photo?[state.photo]:[]};return query;}}));
vi.mock("@/lib/auth",()=>({currentUser:async()=>state.user}));
vi.mock("@/lib/entitlements",()=>({canUseModule:async()=>true}));
vi.mock("@/lib/storage",()=>({PHOTO_BUCKET:"synthetic",storageClient:()=>({send:state.send})}));
import {GET} from "@/app/api/property-photos/[id]/route";
const params={params:Promise.resolve({id:"98000000-0000-4000-8000-000000000001"})};
const request=(tag?:string)=>new Request("https://test.invalid/api/property-photos/98000000-0000-4000-8000-000000000001?v=medium",{headers:tag?{"if-none-match":tag}:{}});
beforeEach(()=>{
 state.photo={tenantId:"tenant-a",tenantStatus:"active",storagePath:"same-path.webp",variants:{},processingStatus:"ready",status:"disponivel",publishedAt:new Date()};
 state.user=null;state.send.mockReset().mockImplementation(async()=>({ETag:'"content-v2"',Body:{transformToWebStream:()=>new ReadableStream({start(controller){controller.enqueue(new Uint8Array([1,2]));controller.close();}})}}));
});
describe("photo cache and authorization",()=>{
 it("never gives publicly cacheable immutable responses",async()=>{const response=await GET(request(),params);expect(response.status).toBe(200);expect(response.headers.get("cache-control")).toBe("private, no-cache, must-revalidate");expect(response.headers.get("etag")).toBe('"content-v2"');});
 it("checks publication before any conditional storage request",async()=>{state.photo!.publishedAt=null;const response=await GET(request('"content-v2"'),params);expect(response.status).toBe(404);expect(state.send).not.toHaveBeenCalled();});
 it("does not reuse another tenant's private photo",async()=>{state.photo!.publishedAt=null;state.user={tenantId:"tenant-b",role:"admin",access:{modules:["imoveis"]}};expect((await GET(request(),params)).status).toBe(404);expect(state.send).not.toHaveBeenCalled();});
 it("revalidates bytes even if the path is unchanged",async()=>{const response=await GET(request('"content-v1"'),params);expect(response.status).toBe(200);expect(response.headers.get("etag")).toBe('"content-v2"');expect(state.send.mock.calls[0][0].input.IfNoneMatch).toBe('"content-v1"');});
 it("returns 304 only after storage confirms unchanged content",async()=>{state.send.mockRejectedValue({$metadata:{httpStatusCode:304}});expect((await GET(request('"content-v2"'),params)).status).toBe(304);});
 it("blocks suspended tenants even for an otherwise public photo",async()=>{state.photo!.tenantStatus="suspended";expect((await GET(request(),params)).status).toBe(404);expect(state.send).not.toHaveBeenCalled();});
});
