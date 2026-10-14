import { sql } from "drizzle-orm";
import { getDb } from "@/db";
/** Persist only allowlisted operational codes, never exception text or user payloads. */
export async function recordOperation(name: string, result: boolean | "skipped", code?: string) {
  const status=result==="skipped"?"skipped":result?"ok":"failed";
  const safeCode=code && /^[a-z0-9_:-]{1,64}$/i.test(code)?code:null;
  await getDb().execute(sql`WITH latest AS (
    INSERT INTO operation_runs(name,status,succeeded_at,failed_at)
    VALUES(${name},${status},CASE WHEN ${status}='ok' THEN now() END,CASE WHEN ${status}='failed' THEN now() END)
    ON CONFLICT(name) DO UPDATE SET status=EXCLUDED.status,updated_at=now(),
      succeeded_at=coalesce(EXCLUDED.succeeded_at,operation_runs.succeeded_at),
      failed_at=coalesce(EXCLUDED.failed_at,operation_runs.failed_at)
  ) INSERT INTO operation_run_events(name,status,code) VALUES(${name},${status},${safeCode})`);
}
