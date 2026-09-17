import { NextResponse } from "next/server";
import { and, eq, isNull, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { visits } from "@/db/schema";
export async function GET(request:Request){const auth=request.headers.get("authorization");if(!process.env.CRON_SECRET||auth!==`Bearer ${process.env.CRON_SECRET}`)return NextResponse.json({error:"Não autorizado"},{status:401});const db=getDb();const due=await db.select({id:visits.id}).from(visits).where(and(eq(visits.status,"agendada"),isNull(visits.reminderSentAt),lte(visits.reminderAt,new Date()))).limit(100);if(due.length)await Promise.all(due.map(({id})=>db.update(visits).set({reminderSentAt:new Date(),updatedAt:new Date()}).where(eq(visits.id,id))));return NextResponse.json({processed:due.length})}
