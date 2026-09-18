"use server";
import {sql} from "drizzle-orm";
import {z} from "zod";
import {revalidatePath} from "next/cache";
import {getDb} from "@/db";
import {requireModule} from "@/lib/access";

export async function moveOpportunity(input:{id:string;stageId:string;beforeId:string|null;fromStageId:string;lostReason?:string}){
 const user=await requireModule("crm");
 const parsed=z.object({id:z.uuid(),stageId:z.uuid(),beforeId:z.uuid().nullable(),fromStageId:z.uuid(),lostReason:z.string().trim().max(2000).optional()}).safeParse(input);
 if(!parsed.success)return{ok:false,message:"Movimentação inválida."};
 const v=parsed.data;const all=user.role==="admin"||user.access.clients==="all";
 try{
  const db=getDb();
  // Lock is held for the complete HTTP batch transaction, serializing concurrent board drops.
  const result=await db.batch([
   db.execute(sql`select pg_advisory_xact_lock(72613021)`),
   db.execute(sql`
    with source as materialized (
     select d.*, s.name old_name from deals d join clients c on c.id=d.client_id join stages s on s.id=d.stage_id
     where d.id=${v.id}::uuid and d.stage_id=${v.fromStageId}::uuid and (${all} or c.assigned_to=${user.id}::uuid)
    ), target as materialized (
     select s.* from stages s, source d where s.id=${v.stageId}::uuid
      and (not s.is_won or s.id=d.stage_id or exists(select 1 from sales where deal_id=d.id))
      and (not s.is_lost or s.id=d.stage_id or length(${v.lostReason||""})>0)
      and (${v.beforeId}::uuid is null or exists(select 1 from deals a join clients c on c.id=a.client_id where a.id=${v.beforeId}::uuid and a.stage_id=s.id and a.id<>d.id and (${all} or c.assigned_to=${user.id}::uuid)))
    ), ordered as materialized (
     select d.id, row_number() over(order by d.position,d.id)::numeric n from deals d, target t where d.stage_id=t.id and d.id<>${v.id}::uuid
    ), inserted as (
     select id,n from ordered union all select d.id,coalesce((select n-0.5 from ordered where id=${v.beforeId}::uuid),(select coalesce(max(n),0)+1 from ordered)) from source d, target t
    ), ranked as (
     select id,row_number() over(order by n,id)*1024 new_position from inserted
    ), moved as (
     update deals d set position=r.new_position,
      stage_id=case when d.id=${v.id}::uuid then ${v.stageId}::uuid else d.stage_id end,
      stage_entered_at=case when d.id=${v.id}::uuid and d.stage_id<>${v.stageId}::uuid then now() else d.stage_entered_at end,
      lost_reason=case when d.id=${v.id}::uuid and d.stage_id<>${v.stageId}::uuid then case when (select is_lost from target) then ${v.lostReason||null} else null end else d.lost_reason end,
      updated_at=case when d.id=${v.id}::uuid then now() else d.updated_at end
     from ranked r where d.id=r.id returning d.id
    ), history as (
     insert into activities(deal_id,client_id,user_id,type,description)
     select d.id,d.client_id,${user.id}::uuid,'stage_changed','Oportunidade movida: '||d.old_name||' → '||t.name||case when t.is_lost then '. Motivo: '||${v.lostReason||""} else '' end
     from source d,target t where d.stage_id<>t.id and exists(select 1 from moved where id=d.id)
    ) select id from moved where id=${v.id}::uuid
   `),
  ]);
  if(!result[1].rows.length)return{ok:false,message:"A oportunidade mudou ou precisa de confirmação de venda/perda. Atualize o quadro e tente novamente."};
  revalidatePath("/painel","layout");return{ok:true,message:"Oportunidade atualizada."};
 }catch(error){console.error("[crm/move]",error instanceof Error?error.message:"failed");return{ok:false,message:"Não foi possível mover a oportunidade. Tente novamente."};}
}
