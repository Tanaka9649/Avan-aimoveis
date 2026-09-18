import {readFileSync,readdirSync} from "node:fs";
import {resolve} from "node:path";
import {beforeAll,afterAll,describe,expect,it,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {drizzle} from "drizzle-orm/pglite";
const mock=vi.hoisted(()=>({db:null as unknown,user:{id:"30000000-0000-4000-8000-000000000001",role:"admin",access:{clients:"all"}}}));
vi.mock("@/db",()=>({getDb:()=>mock.db}));vi.mock("@/lib/access",()=>({requireModule:async()=>mock.user,clientScope:()=>undefined}));vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));vi.mock("next/navigation",()=>({redirect:vi.fn()}));
import {saveCrmClient,saveDeal} from "./actions";
import {saveSale} from "../propostas/actions";
const id=(n:number)=>`30000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
let pg:PGlite;let clientId:string;let dealId:string;
const form=(values:Record<string,string>)=>{const f=new FormData();for(const[k,v]of Object.entries(values))f.set(k,v);return f;};
beforeAll(async()=>{pg=new PGlite();for(const file of readdirSync(resolve("drizzle")).filter(f=>f.endsWith(".sql")).sort()){for(const statement of readFileSync(resolve("drizzle",file),"utf8").split("--> statement-breakpoint"))if(statement.trim())await pg.exec(statement);}
 const db=drizzle(pg);mock.db=Object.assign(db,{batch:async(queries:{toSQL:()=>{sql:string;params:unknown[]}}[])=>pg.transaction(async tx=>{const results=[];for(const query of queries){const q=query.toSQL();results.push(await tx.query(q.sql,q.params));}return results;})});
 await pg.query("insert into users(id,name,email,password_hash,role) values($1,'Teste','teste@example.invalid','unused','admin')",[mock.user.id]);
 await pg.query("insert into stages(id,name,position,color,is_won,is_lost) values($1,'Novos leads',0,'#aaa',false,false),($2,'Ganho',1,'#aaa',true,false),($3,'Perdido',2,'#aaa',false,true)",[id(2),id(3),id(4)]);
 await pg.query("insert into properties(id,code,title,slug,type,price_cents,description,state,city,neighborhood,address_private) values($1,'TEST-1','Casa teste','casa-teste','Casa',40000000,'Teste','MG','Frutal','Centro','Teste')",[id(5)]);
},30000);
afterAll(async()=>{await pg.close();});
describe.sequential("client → opportunity → sale",()=>{
 it("creates a client and detects duplicate contact",async()=>{const data={name:"Cliente teste",phone:"(34) 99999-0000",email:"cliente@example.invalid",origin:"Site",budgetMin:"",budgetMax:"",desiredTypes:"",desiredRegions:"",desiredFeatures:"",minBedrooms:"0",minBathrooms:"0",minParkingSpaces:"0"};const state=await saveCrmClient({ok:false,message:""},form(data));expect(state.ok).toBe(true);clientId=state.clientId!;const duplicate=await saveCrmClient({ok:false,message:""},form(data));expect(duplicate.ok).toBe(false);expect(duplicate.duplicate?.id).toBe(clientId);});
 it("creates without a property and retains the scheduled contact for dashboard queries",async()=>{const result=await saveDeal({ok:false,message:""},form({id:"",clientId,title:"Casa no Centro",stageId:id(2),amount:"400000.50",nextActionAt:"2026-09-22T14:00:00-03:00",nextActionType:"Ligar",nextActionNote:"Retornar ao cliente",lostReason:"",note:"Nota de teste",assignedTo:mock.user.id,returnToBoard:"1"}));expect(result.ok).toBe(true);const{rows}=await pg.query<{id:string;estimated_value_cents:number;next_action_at:Date;next_action_note:string}>("select * from deals");dealId=rows[0].id;expect(rows[0].estimated_value_cents).toBe(40000050);expect(new Date(rows[0].next_action_at).toISOString()).toBe("2026-09-22T17:00:00.000Z");expect(rows[0].next_action_note).toBe("Retornar ao cliente");expect((await pg.query("select * from deal_properties")).rows).toHaveLength(0);});
 it("completes the sale atomically and rejects duplicate submissions",async()=>{const values={dealId,propertyId:id(5),proposalId:"",advertised:"400000",amount:"390000",commissionPercent:"5",soldAt:"2026-09-22",notes:"Fechamento teste"};expect((await saveSale({ok:false,message:""},form(values))).ok).toBe(true);const errorLog=vi.spyOn(console,"error").mockImplementation(()=>{});expect((await saveSale({ok:false,message:""},form(values))).ok).toBe(false);errorLog.mockRestore();expect((await pg.query("select * from sales")).rows).toHaveLength(1);expect((await pg.query("select * from activities where type='venda'")).rows).toHaveLength(1);expect((await pg.query<{stage_id:string;next_action_note:string}>("select * from deals")).rows[0]).toMatchObject({stage_id:id(3),next_action_note:"Retornar ao cliente"});});
});
