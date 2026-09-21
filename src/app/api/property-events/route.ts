import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getDb } from "@/db";
import { properties, propertyViews, whatsappClicks } from "@/db/schema";
import { hashIdentifier } from "@/lib/security";
import { and, eq } from "drizzle-orm";
import { publiclyVisible } from "@/lib/public-properties";

const input=z.object({propertyId:z.uuid(),type:z.enum(["view","whatsapp"]),source:z.string().max(50).default("property")});
export async function POST(request:Request){const parsed=input.safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Evento inválido."},{status:400});// Only publicly visible listings produce public metrics — a view inside the panel or on an
// unpublished draft must never inflate the numbers.
const [property]=await getDb().select({id:properties.id}).from(properties).where(and(eq(properties.id,parsed.data.propertyId),publiclyVisible())).limit(1);if(!property)return NextResponse.json({error:"Imóvel não encontrado."},{status:404});const h=await headers();const visitorHash=hashIdentifier(`${h.get("x-forwarded-for")?.split(",")[0]||"unknown"}:${h.get("user-agent")||"unknown"}`);if(parsed.data.type==="view")await getDb().insert(propertyViews).values({propertyId:property.id,visitorHash,viewedOn:new Date()}).onConflictDoNothing();else await getDb().insert(whatsappClicks).values({propertyId:property.id,visitorHash,source:parsed.data.source});return NextResponse.json({ok:true});}
