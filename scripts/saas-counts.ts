import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

const tables = [
  "users","properties","property_photos","owners","property_documents","clients","stages",
  "deals","opportunity_attachments","activities","visits","proposals","sales","notifications",
  "activity_logs","property_views","whatsapp_clicks",
] as const;

async function main() {
  if (process.env.ALLOW_SAAS_COUNT_REPORT !== "true") throw new Error("Defina ALLOW_SAAS_COUNT_REPORT=true no ambiente confirmado.");
  const db = getDb();
  for (const table of tables) {
    const result = await db.execute(sql.raw(`select count(*)::int as total, count(tenant_id)::int as scoped from "${table}"`));
    const row = result.rows[0] as { total: number; scoped: number };
    console.log(JSON.stringify({ table, total: row.total, scoped: row.scoped, missingTenant: row.total - row.scoped }));
  }
}
main().catch((error) => { console.error(error instanceof Error ? error.message : "Falha no relatório"); process.exit(1); });
