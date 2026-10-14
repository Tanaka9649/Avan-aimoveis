import { expect, it } from "vitest";
import { maskPhone } from "./crm-input";
import { formatMoney } from "./format";
import { propertyErrors } from "./property-wizard";
it("keeps the Brazilian DDD after removing the international country code",()=>{
 expect(maskPhone("+55 34 99999-1234")).toBe("(34) 99999-1234");
 expect(maskPhone("55 99999-1234")).toBe("(55) 99999-1234");
});
it("preserves monetary cents in display",()=>expect(formatMoney(78000001)).toContain("780.000,01"));
it("reports an invalid owner phone on the first wizard step",()=>expect(propertyErrors({ownerPhone:"123",ownerName:"Teste"},0).ownerPhone).toContain("DDD"));
