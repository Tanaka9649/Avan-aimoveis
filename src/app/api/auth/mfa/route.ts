import { NextResponse } from "next/server";
import { reportOperationFailure } from "@/lib/observability";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { userMfa, users } from "@/db/schema";
import { requireSuperAdmin } from "@/lib/access";
import { withApiErrors } from "@/lib/api-errors";
import { verifyPassword } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { consumeMfa } from "@/lib/mfa";
import { decryptMfaSecret, newMfaEnrollment, newRecoveryCodes, verifyMfaTotp } from "@/lib/mfa-crypto";

const json=(body:unknown,status=200)=>NextResponse.json(body,{status,headers:{"Cache-Control":"private, no-store"}});
export const GET=withApiErrors(async()=>{
  const user=await requireSuperAdmin();
  const [row]=await getDb().select({enabledAt:userMfa.enabledAt}).from(userMfa).where(eq(userMfa.userId,user.id));
  return json({enabled:Boolean(row?.enabledAt),configured:Boolean(process.env.MFA_ENCRYPTION_KEY)});
});
export const POST=withApiErrors(async(request:Request)=>{
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"Origem inválida."},403);
  const user=await requireSuperAdmin();
  const parsed=z.object({action:z.enum(["setup","enable","disable"]),password:z.string().min(8).max(200),code:z.string().max(40).default("")}).safeParse(await request.json().catch(()=>null));
  if(!parsed.success)return json({error:"Revise os dados informados."},400);
  if(!await checkRateLimit("mfa-manage:"+user.id,10,300_000))return json({error:"Aguarde alguns minutos antes de tentar novamente."},429);
  const db=getDb();
  const [account]=await db.select({passwordHash:users.passwordHash}).from(users).where(and(eq(users.id,user.id),eq(users.active,true)));
  if(!account||!await verifyPassword(parsed.data.password,account.passwordHash))return json({error:"Não foi possível confirmar sua identidade."},403);
  const [mfa]=await db.select().from(userMfa).where(eq(userMfa.userId,user.id));
  try{
    if(parsed.data.action==="setup"){
      if(mfa?.enabledAt)return json({error:"O segundo fator já está ativo."},409);
      const enrollment=newMfaEnrollment(user.id,user.email);
      const values={pendingSecret:enrollment.encrypted,pendingExpiresAt:new Date(Date.now()+600_000),updatedAt:new Date()};
      const saved=await db.insert(userMfa).values({userId:user.id,...values}).onConflictDoUpdate({target:userMfa.userId,set:values,setWhere:isNull(userMfa.enabledAt)}).returning({id:userMfa.userId});
      if(!saved.length)return json({error:"A configuração mudou. Atualize a página."},409);
      return json({secret:enrollment.secret,uri:enrollment.uri});
    }
    if(parsed.data.action==="enable"){
      if(mfa?.enabledAt||!mfa?.pendingSecret||!mfa.pendingExpiresAt||mfa.pendingExpiresAt<=new Date())return json({error:"Inicie novamente a configuração."},400);
      const step=await verifyMfaTotp(decryptMfaSecret(mfa.pendingSecret,user.id),parsed.data.code,null);
      if(step===null)return json({error:"Código inválido. Confira o horário do autenticador."},400);
      const recovery=newRecoveryCodes(user.id);
      const result=await db.execute(sql`WITH activated AS (
        UPDATE user_mfa SET encrypted_secret=pending_secret,pending_secret=NULL,pending_expires_at=NULL,
          enabled_at=now(),last_time_step=${step},recovery_hashes=${JSON.stringify(recovery.hashes)}::jsonb,updated_at=now()
        WHERE user_id=${user.id}::uuid AND enabled_at IS NULL AND pending_secret=${mfa.pendingSecret} AND pending_expires_at>now() RETURNING user_id
      ), revoked AS (DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM activated)), logged AS (
        INSERT INTO tenant_audit_logs(actor_user_id,action,entity_type,entity_id)
        SELECT user_id,'user.mfa_enabled','user',user_id::text FROM activated
      )
      SELECT user_id FROM activated`);
      if(!result.rows.length)return json({error:"Configuração expirada. Reinicie a configuração."},409);
      // Plain recovery codes are returned once, only to the reauthenticated owner.
      return json({enabled:true,recoveryCodes:recovery.codes,message:"Guarde os códigos em local seguro. Suas sessões foram encerradas; entre novamente com segundo fator."});
    }
    if(!mfa?.enabledAt||!await consumeMfa(user.id,parsed.data.code))return json({error:"Código inválido ou já utilizado."},403);
    await db.execute(sql`WITH removed AS (DELETE FROM user_mfa WHERE user_id=${user.id}::uuid RETURNING user_id), logged AS (
      INSERT INTO tenant_audit_logs(actor_user_id,action,entity_type,entity_id)
      SELECT user_id,'user.mfa_disabled','user',user_id::text FROM removed
    )
      DELETE FROM sessions WHERE user_id IN (SELECT user_id FROM removed)`);
    return json({enabled:false,message:"Segundo fator desativado. Entre novamente."});
  }catch{reportOperationFailure("mfa","management_failed");return json({error:"Segundo fator temporariamente indisponível. Verifique a configuração operacional."},503);}
});
