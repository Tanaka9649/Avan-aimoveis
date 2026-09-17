import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { rateLimits } from "@/db/schema";
import { hashIdentifier } from "./security";

export async function checkRateLimit(identifier:string,limit:number,windowMs:number){const db=getDb();const keyHash=hashIdentifier(identifier);const now=new Date();const windowEndsAt=new Date(now.getTime()+windowMs);const [row]=await db.insert(rateLimits).values({keyHash,count:1,windowEndsAt}).onConflictDoUpdate({target:rateLimits.keyHash,set:{count:sql`case when ${rateLimits.windowEndsAt} < now() then 1 else ${rateLimits.count} + 1 end`,windowEndsAt:sql`case when ${rateLimits.windowEndsAt} < now() then ${windowEndsAt} else ${rateLimits.windowEndsAt} end`,updatedAt:now}}).returning({count:rateLimits.count,windowEndsAt:rateLimits.windowEndsAt});return row.count<=limit||row.windowEndsAt<now}
