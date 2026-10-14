import { platformBaseUrl } from "@/lib/platform-url";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db";
import { passwordResets, tenantMemberships, tenants, users } from "@/db/schema";
import { hashToken, issueToken } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailConfigured, sendEmail } from "@/lib/email";
import { resetPassword } from "@/lib/password-reset";
import { ROOT_TENANT_SLUG } from "@/lib/tenant-routing";
const requested = z.object({ email: z.email(), tenantSlug: z.string().min(1).max(120).default(ROOT_TENANT_SLUG) });
const reset = z.object({ token: z.string().min(32).max(200), password: z.string().min(12).max(200) });
export async function POST(request: Request) {
  const parsed = requested.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  if (!emailConfigured()) return NextResponse.json({ error: "Recuperação por e-mail indisponível. Contate o administrador." }, { status: 503 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const email = parsed.data.email.toLowerCase();
  if (!await checkRateLimit(`reset-ip:${ip}`, 8, 900000) || !await checkRateLimit(`reset-account:${email}`, 3, 900000)) return NextResponse.json({ error: "Aguarde antes de tentar novamente." }, { status: 429 });
  const db = getDb();
  const [row] = await db.select({ id: users.id, hash: users.passwordHash }).from(users)
    .innerJoin(tenantMemberships, eq(tenantMemberships.userId, users.id))
    .innerJoin(tenants, eq(tenants.id, tenantMemberships.tenantId))
    .where(and(eq(users.email, email), eq(users.active, true), eq(tenantMemberships.status, "active"), eq(tenants.slug, parsed.data.tenantSlug), inArray(tenants.status, ["active", "trial"]))).limit(1);
  if (row) {
    const token = issueToken();
    const [record] = await db.insert(passwordResets).values({ userId: row.id, passwordVersion: row.hash, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 1800000) }).returning({ id: passwordResets.id });
    const base = platformBaseUrl();
    if (base) await sendEmail({ to: email, subject: "Redefinir sua senha", text: `Para definir uma nova senha, abra ${base}/redefinir-senha?empresa=${encodeURIComponent(parsed.data.tenantSlug)}#${token} . Este link expira em 30 minutos. Se não solicitou, ignore esta mensagem.`, key: `password-reset/${record.id}` });
  }
  return NextResponse.json({ message: "Se houver uma conta ativa com este e-mail, você receberá as instruções." });
}
export async function PUT(request: Request) {
  const parsed = reset.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Use uma senha com pelo menos 12 caracteres." }, { status: 400 });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (!await checkRateLimit(`reset-use:${ip}`, 10, 900000)) return NextResponse.json({ error: "Aguarde antes de tentar novamente." }, { status: 429 });
  if (!await resetPassword(parsed.data.token, parsed.data.password)) return NextResponse.json({ error: "Link inválido, expirado ou já utilizado." }, { status: 400 });
  return NextResponse.json({ message: "Senha alterada. Entre novamente com a nova senha." });
}
