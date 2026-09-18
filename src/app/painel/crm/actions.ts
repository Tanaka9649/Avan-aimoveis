"use server";
import {randomUUID} from "node:crypto";
import {and,eq,asc} from "drizzle-orm";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getDb} from "@/db";
import {clients,deals,stages,activities,dealProperties,properties,users} from "@/db/schema";
import {requireModule,clientScope} from "@/lib/access";
import {optionalMoney} from "@/lib/client-input";
type State={ok:boolean;message:string};
export async function saveDeal(_:State,form:FormData):Promise<State>{
 const user=await requireModule("crm");const db=getDb();
 const p=z.object({id:z.union([z.uuid(),z.literal("")]),clientId:z.uuid(),title:z.string().trim().min(3).max(180),stageId:z.uuid(),amount:optionalMoney,nextActionAt:z.string().max(40),nextActionType:z.string().trim().max(80),nextActionNote:z.string().trim().max(500),lostReason:z.string().trim().max(2000),note:z.string().trim().max(10000),assignedTo:z.union([z.uuid(),z.literal("")])}).safeParse(Object.fromEntries(form));
 if(!p.success)return {ok:false,message:"Revise título, cliente, etapa e valor."};
 const v=p.data;const [client]=await db.select().from(clients).where(and(eq(clients.id,v.clientId),clientScope(user)));if(!client)return {ok:false,message:"Cliente indisponível."};
 const [stage]=await db.select().from(stages).where(eq(stages.id,v.stageId));if(!stage)return {ok:false,message:"Etapa inválida."};
 if(stage.isLost&&!v.lostReason)return {ok:false,message:"Informe o motivo da perda."};
 const next=v.nextActionAt?new Date(v.nextActionAt):null;if(next&&!Number.isFinite(next.getTime()))return {ok:false,message:"Próxima ação inválida."};
 const links=z.array(z.uuid()).max(100).safeParse(form.getAll("propertyIds"));if(!links.success)return {ok:false,message:"Imóveis inválidos."};
 for(const id of links.data){const [property]=await db.select({id:properties.id}).from(properties).where(eq(properties.id,id));if(!property)return {ok:false,message:"Imóvel indisponível."};}
 if(user.role!=="admin"&&v.assignedTo!==(client.assignedTo||""))return {ok:false,message:"Apenas o administrador pode alterar o responsável."};
 if(v.assignedTo){const [person]=await db.select({id:users.id}).from(users).where(and(eq(users.id,v.assignedTo),eq(users.active,true)));if(!person)return {ok:false,message:"Responsável indisponível."};}
 let stageChanged=true;if(v.id){const [existing]=await db.select({id:deals.id,stageId:deals.stageId}).from(deals).where(and(eq(deals.id,v.id),eq(deals.clientId,v.clientId)));if(!existing)return {ok:false,message:"Oportunidade indisponível."};stageChanged=existing.stageId!==v.stageId;}
 const id=v.id||randomUUID();const values={clientId:v.clientId,title:v.title,stageId:v.stageId,estimatedValueCents:v.amount,nextActionAt:next,nextActionType:v.nextActionType||null,nextActionNote:v.nextActionNote||null,...(stageChanged?{stageEnteredAt:new Date()}:{}),lostReason:stage.isLost?v.lostReason:null,updatedAt:new Date()};
 try{await db.batch([
  v.id?db.update(deals).set(values).where(and(eq(deals.id,id),eq(deals.clientId,client.id))):db.insert(deals).values({id,...values,position:String(Date.now())}),
  db.update(clients).set({assignedTo:v.assignedTo||null,updatedAt:new Date()}).where(and(eq(clients.id,client.id),clientScope(user))),
  db.delete(dealProperties).where(eq(dealProperties.dealId,id)),
  ...(links.data.length?[db.insert(dealProperties).values([...new Set(links.data)].map(propertyId=>({dealId:id,propertyId})))]:[]),
  db.insert(activities).values({clientId:client.id,dealId:id,userId:user.id,type:"deal_updated",description:`${v.id?"Oportunidade atualizada":"Oportunidade criada"}: ${v.title}. Etapa: ${stage.name}.${stage.isLost?" Motivo: "+v.lostReason:""}${v.note?"\n"+v.note:""}`}),
 ]);}catch{return {ok:false,message:"Não foi possível salvar a oportunidade."};}
 revalidatePath("/painel","layout");redirect(`/painel/crm/${id}`);
}
export async function dealChoices(){
 const user=await requireModule("crm");const db=getDb();return {user,stages:await db.select({id:stages.id,name:stages.name}).from(stages).orderBy(asc(stages.position)),clients:await db.select({id:clients.id,name:clients.name,assignedTo:clients.assignedTo}).from(clients).where(clientScope(user)).orderBy(asc(clients.name)),properties:await db.select({id:properties.id,title:properties.title,code:properties.code}).from(properties).orderBy(asc(properties.title)),team:user.role==="admin"?await db.select({id:users.id,name:users.name}).from(users).where(eq(users.active,true)):[]};
}
