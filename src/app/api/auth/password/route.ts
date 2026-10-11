import { NextResponse } from "next/server";
import { sql, eq } from "drizzle-orm";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, verifyPassword } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Entre novamente." }, { status: 401 });
  if (!await checkRateLimit(`change-password:${user.id}`, 5, 900000)) return NextResponse.json({ error: "Aguarde antes de tentar novamente." }, { status: 429 });
  const parsed = z.object({ currentPassword: z.string().min(8).max(200), password: z.string().min(12).max(200) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use uma nova senha com pelo menos 12 caracteres." }, { status: 400 });
  const db = getDb();
  const [row] = await db.select({ hash: users.passwordHash }).from(users).where(eq(users.id, user.id)).limit(1);
  if (!row || !await verifyPassword(parsed.data.currentPassword, row.hash)) return NextResponse.json({ error: "Senha atual incorreta." }, { status: 400 });
  const nextHash = await hashPassword(parsed.data.password);
  const result = await db.execute(sql`WITH changed AS (
    UPDATE users SET password_hash=${nextHash}, updated_at=now() WHERE id=${user.id}::uuid AND password_hash=${row.hash} RETURNING id
  ), revoked AS (DELETE FROM sessions USING changed WHERE sessions.user_id=changed.id RETURNING sessions.id),
  resets AS (DELETE FROM password_resets USING changed WHERE password_resets.user_id=changed.id RETURNING password_resets.id)
  SELECT id FROM changed`);
  if (!result.rows.length) return NextResponse.json({ error: "A senha foi alterada em outra sessão. Entre novamente." }, { status: 409 });
  return NextResponse.json({ message: "Senha alterada e sessões encerradas. Entre novamente." });
}
