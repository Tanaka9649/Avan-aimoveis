import {describe,expect,it} from "vitest";
import {dealPosition,maskPhone,moneyDigits} from "./crm-input";

describe("CRM input helpers",()=>{
 it("creates a database-safe chronological position",()=>{
  const position=dealPosition(1_789_760_000_123);
  expect(position).toBe("1789760000.123");
  expect(position.split(".")[0]).toHaveLength(10);
 });
 it("formats Brazilian phones with DDD",()=>expect(maskPhone("34999990553")).toBe("(34) 99999-0553"));
 it("normalizes Brazilian currency display to numeric reais",()=>expect(moneyDigits("R$ 500.000")).toBe("500000"));
});
