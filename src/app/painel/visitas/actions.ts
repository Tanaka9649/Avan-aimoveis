"use server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activities, clients, properties, visits } from "@/db/schema";
import { requireModule } from "@/lib/access";

const visitInput=z.object({clientId:z.uuid(),propertyId:z.uuid(),dealId:z.union([z.uuid(),z.literal("")]),scheduledAt:z.string().min(1),notes:z.string().trim().max(4000),status:z.enum(["agendada","realizada","cancelada","nao_compareceu"])});
export async function saveVisit(_: {ok:boolean;message:string},formData:FormData){
 const user=await requireModule("visitas");const parsed=visitInput.safeParse(Object.fromEntries(formData));if(!parsed.success)return{ok:false,message:"Revise cliente, imóvel, data e horário."};
 const at=new Date(parsed.data.scheduledAt);if(Number.isNaN(at.getTime()))return{ok:false,message:"Informe uma data e horário válidos."};
 const db=getDb();const [[client],[property]]=await Promise.all([db.select({id:clients.id}).from(clients).where(eq(clients.id,parsed.data.clientId)).limit(1),db.select({id:properties.id}).from(properties).where(eq(properties.id,parsed.data.propertyId)).limit(1)]);if(!client||!property)return{ok:false,message:"Cliente ou imóvel não está mais disponível."};
 await db.batch([db.insert(visits).values({clientId:client.id,propertyId:property.id,dealId:parsed.data.dealId||null,assignedTo:user.id,scheduledAt:at,notes:parsed.data.notes||null,status:parsed.data.status}),db.insert(activities).values({clientId:client.id,dealId:parsed.data.dealId||null,userId:user.id,type:"visita",description:`Visita agendada para ${new Intl.DateTimeFormat("pt-BR",{dateStyle:"short",timeStyle:"short",timeZone:"America/Sao_Paulo"}).format(at)}`})]);
 revalidatePath("/painel/visitas");return{ok:true,message:"Visita salva."};
}
export async function updateVisit(formData:FormData){
 await requireModule("visitas");const parsed=z.object({id:z.uuid(),status:z.enum(["agendada","realizada","cancelada","nao_compareceu"]),feedback:z.string().trim().max(4000)}).safeParse(Object.fromEntries(formData));if(!parsed.success)return;
 await getDb().update(visits).set({status:parsed.data.status,feedback:parsed.data.feedback||null,updatedAt:new Date()}).where(eq(visits.id,parsed.data.id));revalidatePath("/painel/visitas");
}
