import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { getDb } from "@/db";
import { tenantAuditLogs, tenantInvites, tenantMemberships, tenantProvisioning, tenants, users } from "@/db/schema";
import { canActivateMembership, canCreateResource } from "@/lib/entitlements";
import type { Access } from "@/lib/permissions";
import { defaultAccess } from "@/lib/permissions";
import { hashPassword, hashToken, issueToken, verifyPassword } from "@/lib/security";

type InviteRole = "owner" | "admin" | "manager" | "agent" | "viewer";

export async function createTenantInvitation(input: {
  tenantId: string;
  invitedBy: string;
  name: string;
  email: string;
  role?: InviteRole;
  permissions?: Access;
}) {
  const db = getDb();
  const email = input.email.trim().toLowerCase();
  const token = issueToken();
  const expiresAt = new Date(Date.now() + 7 * 86_400_000);
  const [pending] = await db
    .select({ id: tenantInvites.id })
    .from(tenantInvites)
    .where(and(
      eq(tenantInvites.tenantId, input.tenantId),
      eq(tenantInvites.email, email),
      isNull(tenantInvites.acceptedAt),
      gt(tenantInvites.expiresAt, new Date()),
    ))
    .limit(1);
  if (!pending && !await canCreateResource(input.tenantId, "max_users")) {
    throw new Error("tenant_user_quota_exceeded");
  }

  const inviteId = pending?.id || randomUUID();
  const values = {
    name: input.name.trim(),
    email,
    role: input.role || "agent" as const,
    permissions: input.permissions || defaultAccess,
    tokenHash: hashToken(token),
    expiresAt,
    invitedBy: input.invitedBy,
  };
  await db.batch([
    pending
      ? db.update(tenantInvites).set(values).where(and(eq(tenantInvites.id, inviteId), eq(tenantInvites.tenantId, input.tenantId)))
      : db.insert(tenantInvites).values({ id: inviteId, tenantId: input.tenantId, ...values }),
    db.insert(tenantAuditLogs).values({
      tenantId: input.tenantId,
      actorUserId: input.invitedBy,
      action: pending ? "invite_renewed" : "user_invited",
      entityType: "tenant_invite",
      entityId: inviteId,
      metadata: { email, role: values.role },
    }),
  ]);

  const base = (process.env.PLATFORM_BASE_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return { inviteId, inviteUrl: `${base}/convite/${token}`, expiresAt };
}

export async function acceptInvitation(token: string, password: string) {
  const db = getDb();
  const now = new Date();
  const [invite] = await db
    .select()
    .from(tenantInvites)
    .where(and(
      eq(tenantInvites.tokenHash, hashToken(token)),
      isNull(tenantInvites.acceptedAt),
      gt(tenantInvites.expiresAt, now),
    ))
    .limit(1);
  if (!invite) return { ok: false as const, error: "Convite inválido ou expirado." };

  const [tenant] = await db
    .select({ id: tenants.id, slug: tenants.slug, status: tenants.status })
    .from(tenants)
    .where(eq(tenants.id, invite.tenantId))
    .limit(1);
  if (!tenant || tenant.status === "suspended" || tenant.status === "cancelled") {
    return { ok: false as const, error: "A empresa não está disponível." };
  }

  const [existing] = await db.select({ id: users.id, passwordHash: users.passwordHash }).from(users).where(eq(users.email, invite.email)).limit(1);
  const userId = existing?.id || randomUUID();
  const [membership] = existing
    ? await db.select({ status: tenantMemberships.status }).from(tenantMemberships).where(and(eq(tenantMemberships.tenantId, invite.tenantId), eq(tenantMemberships.userId, existing.id))).limit(1)
    : [];
  if (membership?.status !== "active" && !await canActivateMembership(invite.tenantId)) {
    return { ok: false as const, error: "O limite de usuários do plano foi atingido." };
  }
  let userMutation;
  if (existing) {
    if (!await verifyPassword(password, existing.passwordHash)) {
      return { ok: false as const, error: "Esta conta já existe. Informe a senha atual para aceitar o convite." };
    }
    userMutation = db.update(users).set({ active: true, updatedAt: now }).where(eq(users.id, userId));
  } else {
    const passwordHash = await hashPassword(password);
    userMutation = db.insert(users).values({ id: userId, name: invite.name, email: invite.email, passwordHash, role: "equipe", active: true });
  }

  await db.batch([
    userMutation,
    db.insert(tenantMemberships).values({
      tenantId: invite.tenantId,
      userId,
      role: invite.role,
      status: "active",
      permissions: invite.permissions,
      invitedAt: invite.createdAt,
      activatedAt: now,
    }).onConflictDoUpdate({
      target: [tenantMemberships.tenantId, tenantMemberships.userId],
      set: { status: "active", role: invite.role, permissions: invite.permissions, activatedAt: now, updatedAt: now },
    }),
    db.update(tenantInvites).set({ acceptedAt: now }).where(and(eq(tenantInvites.id, invite.id), isNull(tenantInvites.acceptedAt))),
    db.update(tenantProvisioning).set({ status: "complete", lastError: null, updatedAt: now }).where(and(eq(tenantProvisioning.tenantId, invite.tenantId), eq(tenantProvisioning.step, "admin_invite"))),
    db.update(tenants).set({ status: "trial", updatedAt: now }).where(and(eq(tenants.id, invite.tenantId), eq(tenants.status, "configuring"))),
    db.insert(tenantAuditLogs).values({ tenantId: invite.tenantId, actorUserId: userId, action: "invite_accepted", entityType: "user", entityId: userId }),
  ]);
  return { ok: true as const, tenantSlug: tenant.slug };
}
