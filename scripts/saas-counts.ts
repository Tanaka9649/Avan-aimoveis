import { sql } from "drizzle-orm";
import { getDb } from "../src/db";

const tables = [
  { name: "users", tenantOwned: false },
  { name: "reminder_settings", tenantOwned: true },
  { name: "sessions", tenantOwned: true },
  { name: "properties", tenantOwned: true },
  { name: "property_photos", tenantOwned: true },
  { name: "owners", tenantOwned: true },
  { name: "property_owners", tenantOwned: true },
  { name: "document_categories", tenantOwned: true },
  { name: "property_documents", tenantOwned: true },
  { name: "clients", tenantOwned: true },
  { name: "stages", tenantOwned: true },
  { name: "deals", tenantOwned: true },
  { name: "opportunity_attachments", tenantOwned: true },
  { name: "deal_properties", tenantOwned: true },
  { name: "activities", tenantOwned: true },
  { name: "client_favorites", tenantOwned: true },
  { name: "client_property_presentations", tenantOwned: true },
  { name: "visits", tenantOwned: true },
  { name: "proposals", tenantOwned: true },
  { name: "sales", tenantOwned: true },
  { name: "search_alerts", tenantOwned: true },
  { name: "notifications", tenantOwned: true },
  { name: "activity_logs", tenantOwned: true },
  { name: "property_views", tenantOwned: true },
  { name: "whatsapp_clicks", tenantOwned: true },
  { name: "tenants", tenantOwned: false },
  { name: "tenant_memberships", tenantOwned: true },
  { name: "tenant_invites", tenantOwned: true },
  { name: "tenant_modules", tenantOwned: true },
  { name: "tenant_provisioning", tenantOwned: true },
  { name: "tenant_audit_logs", tenantOwned: true },
  { name: "analytics_events", tenantOwned: true },
  { name: "analytics_daily", tenantOwned: true },
] as const;

type IntrospectionRow = {
  relation: string | null;
  has_tenant_id: boolean;
};

type CountRow = {
  total: number;
  scoped?: number;
};

async function main() {
  if (process.env.ALLOW_SAAS_COUNT_REPORT !== "true") {
    throw new Error("Defina ALLOW_SAAS_COUNT_REPORT=true no ambiente confirmado.");
  }

  const db = getDb();

  for (const table of tables) {
    const introspection = await db.execute(sql`
      select
        to_regclass(${`public.${table.name}`})::text as relation,
        exists (
          select 1
          from information_schema.columns
          where table_schema = 'public'
            and table_name = ${table.name}
            and column_name = 'tenant_id'
        ) as has_tenant_id
    `);
    const metadata = introspection.rows[0] as IntrospectionRow;

    if (!metadata.relation) {
      console.log(
        JSON.stringify({
          table: table.name,
          tenantOwned: table.tenantOwned,
          exists: false,
          hasTenantId: false,
          total: null,
          scoped: null,
          missingTenant: null,
        }),
      );
      continue;
    }

    const tenantProjection = metadata.has_tenant_id
      ? ", count(tenant_id)::int as scoped"
      : "";
    const result = await db.execute(
      sql.raw(
        `select count(*)::int as total${tenantProjection} from "${table.name}"`,
      ),
    );
    const row = result.rows[0] as CountRow;
    const scoped = metadata.has_tenant_id ? row.scoped ?? 0 : null;

    console.log(
      JSON.stringify({
        table: table.name,
        tenantOwned: table.tenantOwned,
        exists: true,
        hasTenantId: metadata.has_tenant_id,
        total: row.total,
        scoped,
        missingTenant:
          table.tenantOwned && scoped !== null ? row.total - scoped : null,
      }),
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Falha no relatório");
  process.exit(1);
});
