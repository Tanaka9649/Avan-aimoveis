import "server-only";
import { and, eq, isNotNull, isNull, lt, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { userMfa } from "@/db/schema";
import { decryptMfaSecret, recoveryHash, verifyMfaTotp } from "./mfa-crypto";

export async function enabledMfa(userId:string){
  const [row]=await getDb().select().from(userMfa).where(and(eq(userMfa.userId,userId),isNotNull(userMfa.enabledAt))).limit(1);
  return row || null;
}
/** Atomic consume prevents a TOTP/recovery code being used by two requests. */
export async function consumeMfa(userId:string,token:string){
  const row=await enabledMfa(userId);
  if(!row?.encryptedSecret)return false;
  const db=getDb();
  if(/^\d{6}$/.test(token)){
    const step=await verifyMfaTotp(decryptMfaSecret(row.encryptedSecret,userId),token,row.lastTimeStep);
    if(step===null)return false;
    const changed=await db.update(userMfa).set({lastTimeStep:step,updatedAt:new Date()}).where(and(eq(userMfa.userId,userId),eq(userMfa.encryptedSecret,row.encryptedSecret),isNotNull(userMfa.enabledAt),or(isNull(userMfa.lastTimeStep),lt(userMfa.lastTimeStep,step)))).returning({id:userMfa.userId});
    return changed.length===1;
  }
  if(!/^[a-f\d-]{32,39}$/i.test(token))return false;
  const hashed=recoveryHash(userId,token);
  const changed=await db.update(userMfa).set({recoveryHashes:sql`${userMfa.recoveryHashes} - ${hashed}`,updatedAt:new Date()})
    .where(and(eq(userMfa.userId,userId),isNotNull(userMfa.enabledAt),sql`${userMfa.recoveryHashes} ? ${hashed}`)).returning({id:userMfa.userId});
  return changed.length===1;
}
