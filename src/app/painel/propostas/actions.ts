"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities,deals,properties,proposals,sales,stages } from "@/db/schema";
import { requireModule } from "@/lib/access";
const money=z.coerce.number().positive().max(21474836.47).transform(v=>Math.round(v*100));
const proposalStatuses=["enviada","em_negociacao","contraproposta","aceita","recusada","expirada"] as const;
export async function saveProposal(_:{ok:boolean;message:string},formData:FormData){
 const user=await requireModule("propostas");const p=z.object({dealId:z.uuid(),propertyId:z.uuid(),advertised:money,amount:money,counter:z.union([money,z.literal("")]),validUntil:z.string(),status:z.enum(proposalStatuses),notes:z.string().trim().max(5000)}).safeParse(Object.fromEntries(formData));if(!p.success)return{ok:false,message:"Revise os dados e os valores da proposta."};const valid=p.data.validUntil?new Date(`${p.data.validUntil}T23:59:59`):null;const db=getDb();await db.batch([db.insert(proposals).values({dealId:p.data.dealId,propertyId:p.data.propertyId,advertisedAmountCents:p.data.advertised,amountCents:p.data.amount,counterAmountCents:p.data.counter||null,validUntil:valid,status:p.data.status,notes:p.data.notes||null}),db.insert(activities).values({dealId:p.data.dealId,userId:user.id,type:"proposta",description:"Proposta registrada"})]);revalidatePath("/painel/propostas");return{ok:true,message:"Proposta salva."};
}
export async function updateProposal(formData:FormData){await requireModule("propostas");const p=z.object({id:z.uuid(),status:z.enum(proposalStatuses)}).safeParse(Object.fromEntries(formData));if(!p.success)return;await getDb().update(proposals).set({status:p.data.status,updatedAt:new Date()}).where(eq(proposals.id,p.data.id));revalidatePath("/painel/propostas");}
export async function saveSale(_:{ok:boolean;message:string},formData:FormData){
 const user=await requireModule("propostas");const p=z.object({dealId:z.uuid(),propertyId:z.uuid(),proposalId:z.union([z.uuid(),z.literal("")]),advertised:money,amount:money,commissionPercent:z.coerce.number().min(0).max(100),soldAt:z.string().min(1),notes:z.string().trim().max(5000)}).safeParse(Object.fromEntries(formData));if(!p.success)return{ok:false,message:"Revise os dados da venda."};const soldAt=new Date(`${p.data.soldAt}T12:00:00`);const commission=Math.round(p.data.amount*p.data.commissionPercent/100);const db=getDb();const[won]=await db.select({id:stages.id}).from(stages).where(eq(stages.isWon,true)).limit(1);
 await db.insert(sales).values({dealId:p.data.dealId,propertyId:p.data.propertyId,proposalId:p.data.proposalId||null,advertisedAmountCents:p.data.advertised,amountCents:p.data.amount,commissionPercent:String(p.data.commissionPercent),commissionCents:commission,soldAt,notes:p.data.notes||null});
 await Promise.all([db.update(properties).set({status:"vendido",updatedAt:new Date()}).where(eq(properties.id,p.data.propertyId)),db.insert(activities).values({dealId:p.data.dealId,userId:user.id,type:"venda",description:"Venda concluída"}),won?db.update(deals).set({stageId:won.id,stageEnteredAt:new Date(),updatedAt:new Date()}).where(eq(deals.id,p.data.dealId)):Promise.resolve(),p.data.proposalId?db.update(proposals).set({status:"aceita",updatedAt:new Date()}).where(eq(proposals.id,p.data.proposalId)):Promise.resolve()]);
 revalidatePath("/painel","layout");return{ok:true,message:"Venda concluída e indicadores atualizados."};
}
