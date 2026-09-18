"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { activityLogs, owners } from "@/db/schema";
import { requireModule } from "@/lib/access";
const input=z.object({id:z.union([z.uuid(),z.literal("")]),name:z.string().trim().min(2).max(160),phone:z.string().trim().min(8).max(30),email:z.union([z.email(),z.literal("")]),notes:z.string().trim().max(10000)});
export async function saveOwner(_:{ok:boolean;message:string},formData:FormData){const user=await requireModule("proprietarios");const p=input.safeParse(Object.fromEntries(formData));if(!p.success)return{ok:false,message:"Informe nome, telefone com DDD e um e-mail válido."};const db=getDb();let id=p.data.id;if(id)await db.batch([db.update(owners).set({name:p.data.name,phone:p.data.phone,email:p.data.email||null,notes:p.data.notes||null,updatedAt:new Date()}).where(eq(owners.id,id)),db.insert(activityLogs).values({userId:user.id,entityType:"owner",entityId:id,action:"updated"})]);else{const[row]=await db.insert(owners).values({name:p.data.name,phone:p.data.phone,email:p.data.email||null,notes:p.data.notes||null}).returning({id:owners.id});id=row.id;await db.insert(activityLogs).values({userId:user.id,entityType:"owner",entityId:id,action:"created"});}revalidatePath("/painel/proprietarios","layout");return{ok:true,message:"Proprietário salvo."};}
export async function openOwner(formData:FormData){const id=z.uuid().safeParse(formData.get("id"));if(id.success)redirect(`/painel/proprietarios/${id.data}`);}
