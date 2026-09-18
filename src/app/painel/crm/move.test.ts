import {afterAll,beforeAll,beforeEach,describe,expect,it,vi} from "vitest";
import {PGlite} from "@electric-sql/pglite";
import {PgDialect} from "drizzle-orm/pg-core";
import type {SQL} from "drizzle-orm";
const mock=vi.hoisted(()=>({db:null as unknown,user:{id:"10000000-0000-4000-8000-000000000001",role:"admin",access:{clients:"all"}}}));
vi.mock("@/db",()=>({getDb:()=>mock.db}));vi.mock("@/lib/access",()=>({requireModule:async()=>mock.user}));vi.mock("next/cache",()=>({revalidatePath:vi.fn()}));
import {moveOpportunity} from "./move";
const id=(n:number)=>`20000000-0000-4000-8000-${String(n).padStart(12,"0")}`;
const lead=id(1),contact=id(2),won=id(3),lost=id(4),client=id(5),a=id(6),hidden=id(7),b=id(8);
let pg:PGlite;
beforeAll(async()=>{pg=new PGlite();await pg.exec(`
 create function pg_advisory_xact_lock(bigint) returns void language sql as 'select';
 create table clients(id uuid primary key,assigned_to uuid);
 create table stages(id uuid primary key,name text,is_won boolean default false,is_lost boolean default false);
 create table deals(id uuid primary key,client_id uuid,stage_id uuid,title text,position numeric(20,10),next_action_at timestamptz,next_action_note text,stage_entered_at timestamptz default now(),lost_reason text,updated_at timestamptz default now());
 create table sales(deal_id uuid);
 create table activities(deal_id uuid,client_id uuid,user_id uuid,type text,description text);
 `);const dialect=new PgDialect();mock.db={execute:(query:SQL)=>query,batch:async(queries:SQL[])=>pg.transaction(async tx=>{const results=[];for(const query of queries){const compiled=dialect.sqlToQuery(query);results.push(await tx.query(compiled.sql,compiled.params));}return results;})};},30000);
beforeEach(async()=>{mock.user.role="admin";mock.user.access.clients="all";await pg.exec("truncate clients,stages,deals,sales,activities");await pg.query("insert into clients values($1,$2)",[client,mock.user.id]);for(const [stage,name,isWon,isLost]of[[lead,"Novos leads",false,false],[contact,"Em contato",false,false],[won,"Ganho",true,false],[lost,"Perdido",false,true]])await pg.query("insert into stages values($1,$2,$3,$4)",[stage,name,isWon,isLost]);for(const [deal,position]of[[a,1024],[hidden,2048],[b,3072]])await pg.query("insert into deals(id,client_id,stage_id,title,position,next_action_at,next_action_note) values($1,$2,$3,'Teste',$4,'2026-09-22T14:00:00-03:00','Preservar contato')",[deal,client,lead,position]);});
afterAll(async()=>{await pg.close();});
describe("Kanban PostgreSQL transaction",()=>{
 it("persists stage, records one history entry and preserves next contact",async()=>{expect((await moveOpportunity({id:a,stageId:contact,fromStageId:lead,beforeId:null})).ok).toBe(true);const{rows}=await pg.query<{stage_id:string;next_action_note:string}>("select * from deals where id=$1",[a]);expect(rows[0].stage_id).toBe(contact);expect(rows[0].next_action_note).toBe("Preservar contato");expect((await pg.query("select * from activities")).rows).toHaveLength(1);expect((await moveOpportunity({id:a,stageId:contact,fromStageId:lead,beforeId:null})).ok).toBe(false);expect((await pg.query("select * from activities")).rows).toHaveLength(1);});
 it("reorders without losing hidden cards or adding stage history",async()=>{expect((await moveOpportunity({id:b,stageId:lead,fromStageId:lead,beforeId:a})).ok).toBe(true);expect((await pg.query<{id:string}>("select id from deals order by position")).rows.map(r=>r.id)).toEqual([b,a,hidden]);expect((await pg.query("select * from activities")).rows).toHaveLength(0);});
 it("requires a reason for loss and a recorded sale for winning",async()=>{expect((await moveOpportunity({id:a,stageId:lost,fromStageId:lead,beforeId:null})).ok).toBe(false);expect((await moveOpportunity({id:a,stageId:won,fromStageId:lead,beforeId:null})).ok).toBe(false);expect((await moveOpportunity({id:a,stageId:lost,fromStageId:lead,beforeId:null,lostReason:"Preço"})).ok).toBe(true);expect((await pg.query<{lost_reason:string}>("select lost_reason from deals where id=$1",[a])).rows[0].lost_reason).toBe("Preço");});
 it("rejects inaccessible clients and invalid anchors without partial writes",async()=>{mock.user.role="equipe";mock.user.access.clients="own";await pg.query("update clients set assigned_to=null");expect((await moveOpportunity({id:a,stageId:contact,fromStageId:lead,beforeId:null})).ok).toBe(false);mock.user.role="admin";expect((await moveOpportunity({id:a,stageId:contact,fromStageId:lead,beforeId:b})).ok).toBe(false);expect((await pg.query("select * from activities")).rows).toHaveLength(0);});
});
