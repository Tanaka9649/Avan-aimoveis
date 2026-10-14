import { afterEach, describe, expect, it, vi } from "vitest";
import { uploadBrandingFile } from "./branding-client";
afterEach(()=>vi.unstubAllGlobals());
describe("branding upload confirmation and target scope",()=>{
 it("uploads and confirms under the newly created tenant",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({uploadUrl:"https://storage.example.invalid/signed",contentType:"image/png",publicUrl:"/api/branding/tenant-b/image.png"})).mockResolvedValueOnce(new Response(null,{status:200})).mockResolvedValueOnce(Response.json({publicUrl:"/api/branding/tenant-b/image.png"}));
  vi.stubGlobal("fetch",fetcher);
  const file=new File(["bytes"],"logo.png",{type:"image/png"});
  expect(await uploadBrandingFile(file,false,"tenant-b")).toBe("/api/branding/tenant-b/image.png");
  expect(fetcher.mock.calls.map(call=>call[0])).toEqual(["/api/branding?tenantId=tenant-b","https://storage.example.invalid/signed","/api/branding/confirm?tenantId=tenant-b"]);
  expect(JSON.parse(fetcher.mock.calls[2][1].body)).toMatchObject({asset:"image.png",size:5,favicon:false});
 });
 it("does not expose an unconfirmed image when storage rejects the upload",async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(Response.json({uploadUrl:"https://storage.example.invalid/signed",contentType:"image/png"})).mockResolvedValueOnce(new Response(null,{status:403}));
  vi.stubGlobal("fetch",fetcher);
  await expect(uploadBrandingFile(new File(["bytes"],"logo.png",{type:"image/png"}))).rejects.toThrow("envio");
  expect(fetcher).toHaveBeenCalledTimes(2);
 });
});
