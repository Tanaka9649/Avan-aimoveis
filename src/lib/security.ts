import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);

export async function hashPassword(password: string) {
  const salt = randomBytes(16); const pepper = process.env.AUTH_PEPPER ?? "";
  const derived = await scrypt(password + pepper, salt, 64) as Buffer;
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [,saltHex,hashHex] = stored.split(":"); if(!saltHex||!hashHex) return false;
  const derived = await scrypt(password + (process.env.AUTH_PEPPER ?? ""), Buffer.from(saltHex,"hex"), 64) as Buffer;
  const expected=Buffer.from(hashHex,"hex"); return expected.length===derived.length && timingSafeEqual(expected,derived);
}
export const hashToken = (token: string) => createHash("sha256").update(token + (process.env.AUTH_PEPPER ?? "")).digest("hex");
export const issueToken = () => randomBytes(32).toString("base64url");
export const hashIdentifier = (value: string) => createHash("sha256").update(value + (process.env.IP_HASH_PEPPER ?? "development")).digest("hex");
