"use server";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "@/db";
import { clients, activities } from "@/db/schema";
import { requireModule, clientScope } from "@/lib/access";
import { clientInput } from "@/lib/client-input";
type State = {ok:boolean;message:string};
export async function saveClient(_:State, form:FormData):Promise<State> {
  const user=await requireModule("clientes");
  const parsed=clientInput.safeParse(Object.fromEntries(form));
  if(!parsed.success) return {ok:false,message:"Revise: "+parsed.error.issues.map(i=>i.path.join(".")+" — "+i.message).join("; ")};
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
  const user=await requireModule("clientes");const p=z.object({clientId:z.uuid(),description:z.string().trim().min(2).max(10000)}).safeParse(Object.fromEntries(form));
  if(!p.success)return {ok:false,message:"Informe uma nota de 2 a 10.000 caracteres."};
  const db=getDb();const [client]=await db.select({id:clients.id}).from(clients).where(and(eq(clients.id,p.data.clientId),clientScope(user)));
  if(!client)return {ok:false,message:"Cliente indisponível."};
  await db.insert(activities).values({...p.data,userId:user.id,type:"note"});revalidatePath(`/painel/clientes/${client.id}`);return {ok:true,message:"Nota registrada."};
}
