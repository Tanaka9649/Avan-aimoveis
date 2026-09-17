import { describe,expect,it } from "vitest";
import { calculateCommission,formatMoney } from "./format";
describe("money",()=>{it("formats integer cents without floating point storage",()=>expect(formatMoney(189000000)).toContain("1.890.000"));it("rounds commission to cents",()=>expect(calculateCommission(333333,6)).toBe(20000));it("rejects invalid percentage",()=>expect(()=>calculateCommission(100,101)).toThrow())});
