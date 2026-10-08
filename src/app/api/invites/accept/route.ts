import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptInvitation } from "@/lib/invitations";
const input=z.object({token:z.string().min(20).max(200),password:z.string().min(12).max(128)});
export async function POST(request:Request){try{const parsed=input.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Revise o convite e use uma senha de pelo menos 12 caracteres."},{status:400});const result=await acceptInvitation(parsed.data.token,parsed.data.password);return result.ok?NextResponse.json(result):NextResponse.json({error:result.error},{status:409})}catch{return NextResponse.json({error:"Não foi possível ativar o acesso agora."},{status:503})}}
