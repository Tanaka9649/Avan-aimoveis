import "server-only";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { DOCUMENT_BUCKET, PHOTO_BUCKET, storageClient } from "@/lib/storage";
import { reportOperationFailure } from "@/lib/observability";

export const uploadTables = ["property_photos", "property_documents", "opportunity_attachments", "branding_assets"] as const;
export type UploadTable = typeof uploadTables[number];
const pending = (table: UploadTable) => table === "branding_assets" ? sql`confirmed_at IS NULL` : table === "property_photos" ? sql`processing_status IN ('uploading','processing','failed')` : sql`upload_status='uploading'`;

/** A 10-minute lease exceeds the longest upload function (300 seconds). */
export async function claimUpload(table: UploadTable, tenantId: string, id: string) {
  const rows = await getDb().execute(sql`UPDATE ${sql.identifier(table)}
    SET upload_lease_until=now()+interval '10 minutes'
    WHERE tenant_id=${tenantId}::uuid AND id=${id}::uuid AND ${pending(table)}
      AND upload_expired_at IS NULL AND created_at>now()-interval '24 hours'
      AND (upload_lease_until IS NULL OR upload_lease_until<now()) RETURNING id`);
  return rows.rows.length === 1;
}
export async function releaseUpload(table: UploadTable, tenantId: string, id: string) {
  await getDb().execute(sql`UPDATE ${sql.identifier(table)} SET upload_lease_until=NULL WHERE tenant_id=${tenantId}::uuid AND id=${id}::uuid AND upload_expired_at IS NULL`);
}

type ExpiredRow = { id: string; tenant_id: string; property_id?: string; opportunity_id?: string; asset?: string; storage_path?: string; storage_key?: string; variants?: Record<string,string> };
/** Never delete legacy/shared paths or arbitrary keys supplied by a payload. */
export function expiredUploadObjects(table: UploadTable, row: ExpiredRow) {
  const prefix = `tenants/${row.tenant_id}/`;
  let keys: string[], expected: string;
  if (table === "branding_assets") {
    if (!/^[0-9a-f-]{36}\.(png|jpg|webp|ico)$/i.test(row.asset || "")) throw new Error("unsafe_upload_key");
    expected = prefix + "branding/";
    keys = [expected + "pending/" + row.asset, expected + row.asset];
  } else if (table === "property_photos") {
    expected = prefix + `properties/${row.property_id}/photos/${row.id}`;
    const original = row.storage_path || "";
    if (!original.startsWith(expected + "-original.")) throw new Error("unsafe_upload_key");
    const base = original.replace(/-original\.[^.]+$/, "");
    keys = [original, ...["thumb","medium","full"].map(name => `${base}-${name}.webp`), ...Object.values(row.variants || {})];
  } else {
    expected = prefix + (table === "property_documents" ? `properties/${row.property_id}/documents/${row.id}-` : `opportunities/${row.opportunity_id}/${row.id}-`);
    const original = row.storage_path || row.storage_key || "";
    keys = table === "property_documents" ? [original, original + ".pending"] : [original];
  }
  if (keys.some(key => !key.startsWith(expected) || key.includes(".."))) throw new Error("unsafe_upload_key");
  return { bucket: table === "property_photos" || table === "branding_assets" ? PHOTO_BUCKET : DOCUMENT_BUCKET, keys: [...new Set(keys)] };
}

export async function cleanupAbandonedUploads() {
  const db = getDb();
  let removed = 0, failed = 0;
  const deadline=Date.now()+240_000;
  for (const table of uploadTables) {
    // Durable tombstone precedes storage deletion. Failed deletes remain retryable and charged.
    const result = await db.execute(sql`WITH selected AS (
      SELECT id FROM ${sql.identifier(table)} WHERE ${pending(table)}
        AND created_at<now()-interval '24 hours'
        AND (upload_lease_until IS NULL OR upload_lease_until<now())
      ORDER BY created_at,id LIMIT 10 FOR UPDATE SKIP LOCKED
    ) UPDATE ${sql.identifier(table)} SET upload_expired_at=coalesce(upload_expired_at,now()),
      upload_lease_until=now()+interval '10 minutes'
      WHERE id IN (SELECT id FROM selected) RETURNING *`);
    for (const raw of result.rows) {
      if(Date.now()>deadline)return {removed,failed};
      const row = raw as ExpiredRow;
      try {
        const {bucket,keys} = expiredUploadObjects(table,row);
        for (const key of keys) await storageClient().send(new DeleteObjectCommand({Bucket:bucket,Key:key}), {abortSignal:AbortSignal.timeout(5000)});
        await db.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE id=${row.id}::uuid AND tenant_id=${row.tenant_id}::uuid AND upload_expired_at IS NOT NULL`);
        removed++;
      } catch {
        failed++;
        reportOperationFailure("upload","expired_upload_cleanup_failed");
        // Keep the lease as backoff and the tombstone/keys for the next run.
      }
    }
  }
  return {removed,failed};
}
