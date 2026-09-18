"use server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { clients, activities, clientFavorites, clientPropertyPresentations, properties } from "@/db/schema";
import { requireModule, clientScope } from "@/lib/access";
import { clientInput } from "@/lib/client-input";
type State = {ok:boolean;message:string};
export async function saveClient(_:State, form:FormData):Promise<State> {
  const user=await requireModule("clientes");
  const parsed=clientInput.safeParse(Object.fromEntries(form));
  if(!parsed.success) { const field=parsed.error.issues[0]?.path[0]; const messages:Record<string,string>={name:"Informe o nome completo do cliente.",phone:"Informe um telefone válido com DDD.",email:"Informe um e-mail válido.",origin:"Informe a origem do contato.",budgetMax:"O orçamento máximo deve ser maior que o mínimo.",minBedrooms:"Informe uma quantidade válida de quartos.",minBathrooms:"Informe uma quantidade válida de banheiros.",minParkingSpaces:"Informe uma quantidade válida de vagas."}; return {ok:false,message:messages[String(field)]||"Revise os campos destacados e tente novamente."}; }
  const raw=String(form.get("id")||"");
  if(raw && !z.uuid().safeParse(raw).success) return {ok:false,message:"Cliente inválido."};
  const db=getDb(); const id=raw||randomUUID();
  if(raw){const [allowed]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,id),clientScope(user)));if(!allowed)return {ok:false,message:"Cliente indisponível."};}
  const {budgetMin,budgetMax,...rest}=parsed.data;
  const values={...rest,budgetMinCents:budgetMin,budgetMaxCents:budgetMax,updatedAt:new Date()};
  try {await db.batch([
    raw ? db.update(clients).set(values).where(and(eq(clients.id,id),clientScope(user))) : db.insert(clients).values({id,...values,assignedTo:user.id}),
    db.insert(activities).values({clientId:id,userId:user.id,type:raw?"client_updated":"client_created",description:raw?"Cadastro e preferências atualizados.":"Cliente cadastrado pela equipe."}),
  ]);}catch{return {ok:false,message:"Não foi possível salvar o cliente. Tente novamente."};}
  revalidatePath("/painel","layout");redirect(`/painel/clientes/${id}`);
}
export async function addClientNote(_:State,form:FormData):Promise<State>{
  const user=await requireModule("clientes");const p=z.object({clientId:z.uuid(),type:z.enum(["ligacao","whatsapp","visita","proposta","observacao","desistencia","retorno"]),description:z.string().trim().min(2).max(10000)}).safeParse(Object.fromEntries(form));
  if(!p.success)return {ok:false,message:"Informe uma nota de 2 a 10.000 caracteres."};
  const db=getDb();const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,p.data.clientId),clientScope(user)));
  if(!client)return {ok:false,message:"Cliente indisponível."};
  await db.insert(activities).values({...p.data,userId:user.id});revalidatePath(`/painel/clientes/${client.id}`);return {ok:true,message:"Interação registrada."};
}

async function allowedClient(id:string,user:Awaited<ReturnType<typeof requireModule>>){return (await getDb().select({id:clients.id}).from(clients).where(and(eq(clients.id,id),clientScope(user))).limit(1))[0];}
export async function toggleFavorite(form:FormData){const user=await requireModule("clientes");const p=z.object({clientId:z.uuid(),propertyId:z.uuid(),remove:z.enum(["0","1"])}).safeParse(Object.fromEntries(form));if(!p.success||!await allowedClient(p.data.clientId,user))return;const db=getDb();if(p.data.remove==="1")await db.delete(clientFavorites).where(and(eq(clientFavorites.clientId,p.data.clientId),eq(clientFavorites.propertyId,p.data.propertyId)));else{const [property]=await db.select({id:properties.id}).from(properties).where(eq(properties.id,p.data.propertyId));if(property)await db.insert(clientFavorites).values({clientId:p.data.clientId,propertyId:p.data.propertyId,createdBy:user.id}).onConflictDoNothing();}revalidatePath(`/painel/clientes/${p.data.clientId}`);}
export async function registerPresentation(form:FormData){const user=await requireModule("clientes");const p=z.object({clientId:z.uuid(),propertyId:z.uuid(),channel:z.enum(["whatsapp","link","email","presencial","outro"])}).safeParse(Object.fromEntries(form));if(!p.success||!await allowedClient(p.data.clientId,user))return;await getDb().batch([getDb().insert(clientPropertyPresentations).values({...p.data,userId:user.id}),getDb().insert(activities).values({clientId:p.data.clientId,userId:user.id,type:"imovel_apresentado",description:`Imóvel apresentado ao cliente via ${p.data.channel}.`})]);revalidatePath(`/painel/clientes/${p.data.clientId}`);}
