"use server";
import { revalidatePath } from "next/cache";
import { and,eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities,clients,deals,properties,proposals,sales,stages } from "@/db/schema";
import { clientScope,requireModule } from "@/lib/access";
import { parseOperationDateTime } from "@/lib/datetime";
const money=z.coerce.number().positive().max(21474836.47).transform(v=>Math.round(v*100));
const proposalStatuses=["enviada","em_negociacao","contraproposta","aceita","recusada","expirada"] as const;
export async function saveProposal(_:{ok:boolean;message:string},formData:FormData){
 const user=await requireModule("propostas");const p=z.object({dealId:z.uuid(),propertyId:z.uuid(),advertised:money,amount:money,counter:z.union([money,z.literal("")]),validUntil:z.string(),status:z.enum(proposalStatuses),notes:z.string().trim().max(5000)}).safeParse(Object.fromEntries(formData));if(!p.success)return{ok:false,message:"Revise os dados e os valores da proposta."};const valid=p.data.validUntil?parseOperationDateTime(p.data.validUntil,{endOfDay:true}):null;if(p.data.validUntil&&!valid)return{ok:false,message:"Informe uma validade válida."};const db=getDb();await db.batch([db.insert(proposals).values({dealId:p.data.dealId,propertyId:p.data.propertyId,advertisedAmountCents:p.data.advertised,amountCents:p.data.amount,counterAmountCents:p.data.counter||null,validUntil:valid,status:p.data.status,notes:p.data.notes||null}),db.insert(activities).values({dealId:p.data.dealId,userId:user.id,type:"proposta",description:"Proposta registrada"})]);revalidatePath("/painel/propostas");return{ok:true,message:"Proposta salva."};
}
export async function updateProposal(formData:FormData){await requireModule("propostas");const p=z.object({id:z.uuid(),status:z.enum(proposalStatuses)}).safeParse(Object.fromEntries(formData));if(!p.success)return;await getDb().update(proposals).set({status:p.data.status,updatedAt:new Date()}).where(eq(proposals.id,p.data.id));revalidatePath("/painel/propostas");}
export async function saveSale(_:{ok:boolean;message:string},formData:FormData){
 const user=await requireModule("propostas");const p=z.object({dealId:z.uuid(),propertyId:z.uuid(),proposalId:z.union([z.uuid(),z.literal("")]),advertised:money,amount:money,commissionPercent:z.coerce.number().min(0).max(100),soldAt:z.string().min(1),notes:z.string().trim().max(5000)}).safeParse(Object.fromEntries(formData));if(!p.success)return{ok:false,message:"Revise os dados da venda."};const soldAt=parseOperationDateTime(p.data.soldAt);const commission=Math.round(p.data.amount*p.data.commissionPercent/100);const db=getDb();const[won]=await db.select({id:stages.id}).from(stages).where(eq(stages.isWon,true)).limit(1);
 if(!won||!soldAt)return{ok:false,message:"Confira a data e a etapa de fechamento."};
 const[deal]=await db.select({id:deals.id,clientId:clients.id,stage:stages.name}).from(deals).innerJoin(clients,eq(clients.id,deals.clientId)).innerJoin(stages,eq(stages.id,deals.stageId)).where(and(eq(deals.id,p.data.dealId),clientScope(user)));
 if(!deal)return{ok:false,message:"Oportunidade indisponível."};
 if(p.data.proposalId){const[proposal]=await db.select({id:proposals.id}).from(proposals).where(and(eq(proposals.id,p.data.proposalId),eq(proposals.dealId,deal.id),eq(proposals.propertyId,p.data.propertyId)));if(!proposal)return{ok:false,message:"A proposta não pertence a esta oportunidade e imóvel."};}
 try{await db.batch([
 db.insert(sales).values({dealId:p.data.dealId,propertyId:p.data.propertyId,proposalId:p.data.proposalId||null,advertisedAmountCents:p.data.advertised,amountCents:p.data.amount,commissionPercent:String(p.data.commissionPercent),commissionCents:commission,soldAt,notes:p.data.notes||null}),
 db.update(properties).set({status:"vendido",updatedAt:new Date()}).where(eq(properties.id,p.data.propertyId)),
 db.insert(activities).values({dealId:deal.id,clientId:deal.clientId,userId:user.id,type:"venda",description:`Venda concluída. Oportunidade movida: ${deal.stage} → Ganho`}),
 db.update(deals).set({stageId:won.id,stageEnteredAt:new Date(),lostReason:null,updatedAt:new Date()}).where(eq(deals.id,deal.id)),
 ...(p.data.proposalId?[db.update(proposals).set({status:"aceita",updatedAt:new Date()}).where(eq(proposals.id,p.data.proposalId))]:[]),
 ]);}catch(error){console.error("[crm/sale]",error instanceof Error?error.message:"failed");return{ok:false,message:"Não foi possível concluir. Verifique se a oportunidade ou o imóvel já possui venda registrada."};}
 revalidatePath("/painel","layout");return{ok:true,message:"Venda concluída e indicadores atualizados."};
}
