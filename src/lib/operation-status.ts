import { sql } from "drizzle-orm";
import { getDb } from "@/db";
export async function recordOperation(name: string, succeeded: boolean) {
  await getDb().execute(sql`INSERT INTO operation_runs(name,status,succeeded_at,failed_at)
    VALUES(${name},${succeeded ? "ok" : "failed"},CASE WHEN ${succeeded} THEN now() END,CASE WHEN ${!succeeded} THEN now() END)
    ON CONFLICT(name) DO UPDATE SET status=EXCLUDED.status,updated_at=now(),
    succeeded_at=coalesce(EXCLUDED.succeeded_at,operation_runs.succeeded_at),failed_at=coalesce(EXCLUDED.failed_at,operation_runs.failed_at)`);
}
