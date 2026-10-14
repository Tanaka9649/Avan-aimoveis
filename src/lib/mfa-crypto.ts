import { createCipheriv, createDecipheriv, randomBytes, createHash } from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";

function key() {
  const value = process.env.MFA_ENCRYPTION_KEY;
  if (!value || !/^[A-Za-z0-9+/]{43}=$/.test(value)) throw new Error("mfa_key_unavailable");
  const decoded = Buffer.from(value, "base64");
  if (decoded.length !== 32) throw new Error("mfa_key_unavailable");
  return decoded;
}
export function encryptMfaSecret(secret: string, userId: string) {
  const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",key(),iv);
  cipher.setAAD(Buffer.from(userId));
  const data=Buffer.concat([cipher.update(secret,"utf8"),cipher.final()]);
  return ["v1",iv.toString("base64"),cipher.getAuthTag().toString("base64"),data.toString("base64")].join(".");
}
export function decryptMfaSecret(encrypted: string, userId: string) {
  const [version,iv,tag,data]=encrypted.split(".");
  if(version!=="v1"||!iv||!tag||!data)throw new Error("mfa_secret_invalid");
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64"));
  decipher.setAAD(Buffer.from(userId));decipher.setAuthTag(Buffer.from(tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(data,"base64")),decipher.final()]).toString("utf8");
}
export function newMfaEnrollment(userId:string,email:string){
  const secret=generateSecret();
  return {secret,encrypted:encryptMfaSecret(secret,userId),uri:generateURI({issuer:"Plataforma Imobiliária",label:email,secret})};
}
export async function verifyMfaTotp(secret:string,token:string,lastTimeStep:number|null,epoch?:number){
  if(!/^\d{6}$/.test(token))return null;
  const result=await verify({secret,token,epoch,epochTolerance:30,...(lastTimeStep!==null?{afterTimeStep:lastTimeStep}:{})});
  return result.valid && "timeStep" in result ? result.timeStep : null;
}
export const recoveryHash=(userId:string,code:string)=>createHash("sha256").update(userId+":"+code.replace(/-/g,"").toLowerCase()).digest("hex");
export function newRecoveryCodes(userId:string){
  const codes=Array.from({length:8},()=>randomBytes(16).toString("hex").match(/.{4}/g)!.join("-"));
  return {codes,hashes:codes.map(code=>recoveryHash(userId,code))};
}
