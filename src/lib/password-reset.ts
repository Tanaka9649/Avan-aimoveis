import "server-only";
import { sql } from "drizzle-orm";
import { getDb } from "@/db";
import { hashPassword, hashToken } from "@/lib/security";

export async function resetPassword(token: string, password: string) {
  const passwordHash = await hashPassword(password);
  const result = await getDb().execute(sql`
    WITH eligible AS MATERIALIZED (
      SELECT r.id, r.user_id, r.password_version FROM password_resets r
      JOIN users u ON u.id = r.user_id
      WHERE r.token_hash = ${hashToken(token)} AND r.used_at IS NULL
        AND r.expires_at > now() AND u.active = true
      FOR UPDATE OF r
    ), changed AS (
      UPDATE users u SET password_hash = ${passwordHash}, updated_at = now()
      FROM eligible e WHERE u.id = e.user_id AND u.password_hash = e.password_version
      RETURNING u.id
    ), consumed AS (
      UPDATE password_resets r SET used_at = now()
      FROM changed c WHERE r.user_id = c.id RETURNING r.id
    ), revoked AS (
      DELETE FROM sessions s USING changed c WHERE s.user_id = c.id RETURNING s.id
    ) SELECT id FROM changed
  `);
  return result.rows.length === 1;
}
