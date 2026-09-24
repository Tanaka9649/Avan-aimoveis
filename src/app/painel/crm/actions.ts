"use server";
import {randomUUID} from "node:crypto";
import {and,eq,asc,ne,or,sql} from "drizzle-orm";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {z} from "zod";
import {getDb} from "@/db";
import {clients,deals,stages,activities,dealProperties,properties,users} from "@/db/schema";
import {requireModule,clientScope} from "@/lib/access";
import {clientInput,optionalMoney} from "@/lib/client-input";
import {dealPosition} from "@/lib/crm-input";
import { parseOperationDateTime } from "@/lib/datetime";
type State={ok:boolean;message:string};
export type CrmClientState={ok:boolean;message:string;clientId?:string;duplicate?:{id:string;name:string}};
export async function saveDeal(_:State,form:FormData):Promise<State>{
 const user=await requireModule("crm");const db=getDb();
 const p=z.object({id:z.union([z.uuid(),z.literal("")]),clientId:z.uuid(),title:z.string().trim().min(3).max(180),stageId:z.uuid(),amount:optionalMoney,nextActionAt:z.string().max(40),nextActionType:z.string().trim().max(80),nextActionNote:z.string().trim().max(500),lostReason:z.string().trim().max(2000),note:z.string().trim().max(10000),assignedTo:z.union([z.uuid(),z.literal("")])}).safeParse(Object.fromEntries(form));
 if(!p.success)return {ok:false,message:"Revise título, cliente, etapa e valor."};
 const v=p.data;const [client]=await db.select().from(clients).where(and(eq(clients.id,v.clientId),clientScope(user)));if(!client)return {ok:false,message:"Cliente indisponível."};
 const [stage]=await db.select().from(stages).where(eq(stages.id,v.stageId));if(!stage)return {ok:false,message:"Etapa inválida."};
 if(stage.isLost&&!v.lostReason)return {ok:false,message:"Informe o motivo da perda."};
 if(v.nextActionType&&!v.nextActionAt)return {ok:false,message:"Escolha uma data para a próxima ação."};
 if(stage.isWon){const [current]=v.id?await db.select({stageId:deals.stageId}).from(deals).where(eq(deals.id,v.id)):[];if(current?.stageId!==stage.id)return{ok:false,message:"Conclua a venda pelo Kanban para mover a oportunidade para Ganho."};}
 const next=v.nextActionAt?parseOperationDateTime(v.nextActionAt):null;if(v.nextActionAt&&!next)return {ok:false,message:"Próxima ação inválida."};
 const links=z.array(z.uuid()).max(100).safeParse(form.getAll("propertyIds"));if(!links.success)return {ok:false,message:"Imóveis inválidos."};
 for(const id of links.data){const [property]=await db.select({id:properties.id}).from(properties).where(eq(properties.id,id));if(!property)return {ok:false,message:"Imóvel indisponível."};}
 if(user.role!=="admin"&&v.assignedTo!==(client.assignedTo||""))return {ok:false,message:"Apenas o administrador pode alterar o responsável."};
 if(v.assignedTo){const [person]=await db.select({id:users.id}).from(users).where(and(eq(users.id,v.assignedTo),eq(users.active,true)));if(!person)return {ok:false,message:"Responsável indisponível."};}
 let stageChanged=true;if(v.id){const [existing]=await db.select({id:deals.id,stageId:deals.stageId}).from(deals).where(and(eq(deals.id,v.id),eq(deals.clientId,v.clientId)));if(!existing)return {ok:false,message:"Oportunidade indisponível."};stageChanged=existing.stageId!==v.stageId;}
 const id=v.id||randomUUID();const values={clientId:v.clientId,title:v.title,stageId:v.stageId,estimatedValueCents:v.amount,nextActionAt:next,nextActionType:v.nextActionType||null,nextActionNote:v.nextActionNote||null,...(stageChanged?{stageEnteredAt:new Date()}:{}),lostReason:stage.isLost?v.lostReason:null,updatedAt:new Date()};
 try{await db.batch([
  v.id?db.update(deals).set(values).where(and(eq(deals.id,id),eq(deals.clientId,client.id))):db.insert(deals).values({id,...values,position:dealPosition(Date.now())}),
  db.update(clients).set({assignedTo:v.assignedTo||null,updatedAt:new Date()}).where(and(eq(clients.id,client.id),clientScope(user))),
  db.delete(dealProperties).where(eq(dealProperties.dealId,id)),
  ...(links.data.length?[db.insert(dealProperties).values([...new Set(links.data)].map(propertyId=>({dealId:id,propertyId})))]:[]),
  db.insert(activities).values({clientId:client.id,dealId:id,userId:user.id,type:"deal_updated",description:`${v.id?"Oportunidade atualizada":"Oportunidade criada"}: ${v.title}. Etapa: ${stage.name}.${stage.isLost?" Motivo: "+v.lostReason:""}${v.note?"\n"+v.note:""}`}),
 ]);}catch(error){console.error("[crm/saveDeal] failed",{error:error instanceof Error?error.message:String(error),userId:user.id,clientId:client.id});return {ok:false,message:"Não foi possível salvar a oportunidade."};}
 revalidatePath("/painel","layout");if(form.get("returnToBoard")==="1")return{ok:true,message:"Oportunidade criada com sucesso."};redirect(`/painel/crm/${id}`);
}

export async function saveCrmClient(_:CrmClientState,form:FormData):Promise<CrmClientState>{
 const user=await requireModule("crm");
 const parsed=clientInput.safeParse(Object.fromEntries(form));
 if(!parsed.success){
  const field=String(parsed.error.issues[0]?.path[0]||"");
  const messages:Record<string,string>={name:"Informe o nome completo do cliente.",phone:"Informe um telefone válido com DDD.",email:"Informe um e-mail válido.",origin:"Informe a origem do contato.",budgetMax:"O orçamento máximo deve ser maior que o mínimo.",minBedrooms:"Informe uma quantidade válida de quartos.",minBathrooms:"Informe uma quantidade válida de banheiros.",minParkingSpaces:"Informe uma quantidade válida de vagas."};
  return{ok:false,message:messages[field]||"Revise os campos e tente novamente."};
 }
 const raw=String(form.get("id")||"");
 if(raw&&!z.uuid().safeParse(raw).success)return{ok:false,message:"Cliente inválido."};
 const db=getDb();
 const duplicateIdentity=parsed.data.email?or(eq(clients.phone,parsed.data.phone),eq(clients.email,parsed.data.email)):eq(clients.phone,parsed.data.phone);
 const [duplicate]=await db.select({id:clients.id,name:clients.name}).from(clients).where(and(clientScope(user),duplicateIdentity,raw?ne(clients.id,raw):undefined)).limit(1);
 if(duplicate)return{ok:false,message:"Já existe um cliente com este telefone ou e-mail.",duplicate};
 if(raw){const [allowed]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,raw),clientScope(user))).limit(1);if(!allowed)return{ok:false,message:"Cliente indisponível."};}
 const id=raw||randomUUID();
 const{budgetMin,budgetMax,...rest}=parsed.data;
 const values={...rest,budgetMinCents:budgetMin,budgetMaxCents:budgetMax,updatedAt:new Date()};
 try{
  await db.batch([
   raw?db.update(clients).set(values).where(and(eq(clients.id,id),clientScope(user))):db.insert(clients).values({id,...values,assignedTo:user.id}),
   db.insert(activities).values({clientId:id,userId:user.id,type:raw?"client_updated":"client_created",description:raw?"Cadastro e preferências atualizados no CRM.":"Cliente cadastrado pelo CRM."}),
  ]);
 }catch(error){console.error("[crm/saveClient] failed",{error:error instanceof Error?error.message:String(error),userId:user.id,clientId:id});return{ok:false,message:"Não foi possível salvar o cliente. Tente novamente."};}
 revalidatePath("/painel/crm");
 revalidatePath("/painel/busca");
 return{ok:true,message:raw?"Alterações salvas com sucesso.":"Cliente cadastrado com sucesso.",clientId:id};
}
export async function dealChoices(){
 const user=await requireModule("crm");const db=getDb();const [stageRows,clientRows,propertyRows,team]=await Promise.all([db.select({id:stages.id,name:stages.name,isWon:stages.isWon,isLost:stages.isLost}).from(stages).orderBy(asc(stages.position)),db.select({id:clients.id,name:clients.name,phone:clients.phone,assignedTo:clients.assignedTo}).from(clients).where(clientScope(user)).orderBy(asc(clients.name)),db.select({id:properties.id,title:properties.title,code:properties.code,priceCents:properties.priceCents,city:properties.city,neighborhood:properties.neighborhood,photoId:sql<string|null>`(select id from property_photos where property_id=${properties.id} and processing_status='ready' order by is_cover desc, position limit 1)`}).from(properties).orderBy(asc(properties.title)),user.role==="admin"?db.select({id:users.id,name:users.name}).from(users).where(eq(users.active,true)):Promise.resolve([])]);return {stages:stageRows,clients:clientRows,properties:propertyRows,team};
}
