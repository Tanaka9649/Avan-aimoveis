import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashToken } from "./security";

export const SESSION_COOKIE = "avan_session";
export async function currentUser(){const token=(await cookies()).get(SESSION_COOKIE)?.value;if(!token)return null;const db=getDb();const [row]=await db.select({id:users.id,name:users.name,email:users.email,role:users.role}).from(sessions).innerJoin(users,eq(users.id,sessions.userId)).where(and(eq(sessions.tokenHash,hashToken(token)),gt(sessions.expiresAt,new Date()),eq(users.active,true))).limit(1);return row??null}
export async function requireUser(){const user=await currentUser();if(!user)redirect("/login");return user}
