import "server-only";
import { getDb } from "@/db";
import { tenantAuditLogs } from "@/db/schema";

const blockedKeys = new Set(["password", "passwordHash", "token", "tokenHash", "secret", "signedUrl", "document"]);
function safeMetadata(input: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(input).filter(([key]) => !blockedKeys.has(key)));
}
export async function auditTenantAction(input: { tenantId?: string | null; actorUserId?: string | null; action: string; entityType: string; entityId?: string | null; metadata?: Record<string, unknown> }) {
  await getDb().insert(tenantAuditLogs).values({ tenantId: input.tenantId || null, actorUserId: input.actorUserId || null, action: input.action, entityType: input.entityType, entityId: input.entityId || null, metadata: safeMetadata(input.metadata || {}) });
}
