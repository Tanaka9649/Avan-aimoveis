import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
async function main() {
  const journal=JSON.parse(readFileSync("drizzle/meta/_journal.json","utf8"));
  const latest=journal.entries.at(-1);
  const hash=createHash("sha256").update(readFileSync(`drizzle/${latest.tag}.sql`)).digest("hex");
  const db=neon(process.env.DIRECT_URL || process.env.DATABASE_URL || "");
  const [row]=await db`SELECT hash,created_at FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 1`;
  if(!row || row.hash!==hash || Number(row.created_at)!==latest.when) throw new Error("Database migration does not match this release. Apply reviewed migrations first.");
  console.log(`Schema verified: ${latest.tag}`);
}
main().catch(error=>{console.error(error instanceof Error ? error.message : "Schema verification failed");process.exit(1);});
