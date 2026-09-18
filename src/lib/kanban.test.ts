import {describe,expect,it} from "vitest";
import {placeCard} from "./kanban";
describe("optimistic board order",()=>{
 const cards=[{id:"a",stageId:"lead",nextAction:"tomorrow"},{id:"b",stageId:"lead",nextAction:"today"},{id:"c",stageId:"visit",nextAction:"later"}];
 it("moves between stages without changing commercial fields or the rollback snapshot",()=>{const next=placeCard(cards,"a","visit","c");expect(next.map(c=>c.id)).toEqual(["b","a","c"]);expect(next[1].nextAction).toBe("tomorrow");expect(cards[0].stageId).toBe("lead");});
 it("reorders within a column",()=>expect(placeCard(cards,"b","lead","a").map(c=>c.id)).toEqual(["b","a","c"]));
});
