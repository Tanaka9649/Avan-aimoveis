import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { PGlite } from "@electric-sql/pglite";

export async function applyDrizzleMigrations(pg: PGlite) {
  const files = readdirSync(resolve("drizzle"))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const statements = readFileSync(resolve("drizzle", file), "utf8")
      .split("--> statement-breakpoint")
      .map((statement) => statement.trim())
      .filter(Boolean);

    await pg.transaction(async (transaction) => {
      for (const statement of statements) {
        await transaction.exec(statement);
      }
    });
  }
}
