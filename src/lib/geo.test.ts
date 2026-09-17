import { describe,expect,it } from "vitest";
import { approximateCoordinate } from "./geo";
describe("public location privacy",()=>{it("is deterministic for the same property",()=>expect(approximateCoordinate(-23.5614,"p1","lat","secret")).toBe(approximateCoordinate(-23.5614,"p1","lat","secret")));it("does not expose the precise coordinate",()=>expect(approximateCoordinate(-23.5614123,"p1","lat","secret")).not.toBe(-23.5614123))});
