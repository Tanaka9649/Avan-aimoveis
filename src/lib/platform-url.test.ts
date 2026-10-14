import { afterEach, describe, expect, it, vi } from "vitest";
import { platformBaseUrl } from "./platform-url";
import { telephoneContactUrl, whatsappContactUrl } from "./contact";
afterEach(()=>vi.unstubAllEnvs());
describe("environment and contact URLs",()=>{
 it("never generates Production links from Preview",()=>{
  vi.stubEnv("VERCEL_ENV","preview");vi.stubEnv("VERCEL_URL","preview-test.vercel.app");vi.stubEnv("PLATFORM_BASE_URL","https://production.example");
  expect(platformBaseUrl()).toBe("https://preview-test.vercel.app");
 });
 it("adds country code exactly once, including Brazilian DDD 55",()=>{
  for(const value of ["34999991234","5534999991234","+55 (34) 99999-1234"]){expect(telephoneContactUrl(value)).toBe("tel:+5534999991234");expect(whatsappContactUrl(value)).toContain("wa.me/5534999991234?");}
  expect(telephoneContactUrl("55999991234")).toBe("tel:+5555999991234");
  expect(telephoneContactUrl("")).toBeNull();
 });
});
