import { neon } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";
async function main() {
  const url = process.env.DATABASE_URL || "";
  if (new URL(url).hostname !== "ep-polished-mouse-b5478dlj-pooler.c-7.us-east-2.aws.neon.tech") throw new Error("Development project only");
  const sql = neon(url);
  const rows = await sql`select created_at from drizzle.__drizzle_migrations order by created_at desc limit 1`;
  const after = Number(rows[0]?.created_at || 0);
  const pending = readMigrationFiles({ migrationsFolder: "./drizzle" }).filter((m) => m.folderMillis > after);
  for (const migration of pending) {
    await sql.transaction([
      ...migration.sql.filter((q) => q.trim()).map((q) => sql.query(q, [])),
      sql`insert into drizzle.__drizzle_migrations(hash, created_at) values(${migration.hash}, ${migration.folderMillis})`,
    ]);
  }
  const email = process.env.INITIAL_REMINDER_EMAIL;
  if (email) await sql`insert into reminder_settings(key, panel, email, recipients) values('visits', true, true, ${JSON.stringify([email])}::jsonb) on conflict(key) do nothing`;
  console.log("Development migrations applied:", pending.length);
}
main().catch(() => { console.error("Development migration failed; inspect safely without logging credentials."); process.exitCode = 1; });
