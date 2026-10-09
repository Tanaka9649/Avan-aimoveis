-- Internal SaaS consistency and query-path hardening.
-- This migration does not delete or update any property, photo, client, opportunity, proposal or sale record.

-- A tenant with no custom domain cannot have an active custom-domain status.
UPDATE tenants
SET domain_status = 'pending',
    updated_at = now()
WHERE custom_domain IS NULL
  AND domain_status <> 'pending';
--> statement-breakpoint

-- Tenant-first indexes for the highest-frequency internal CRM/admin reads.
CREATE INDEX IF NOT EXISTS clients_tenant_updated_idx
  ON clients (tenant_id, updated_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS clients_tenant_assigned_idx
  ON clients (tenant_id, assigned_to);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_tenant_stage_position_idx
  ON deals (tenant_id, stage_id, position);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_tenant_client_idx
  ON deals (tenant_id, client_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS deals_tenant_next_action_idx
  ON deals (tenant_id, next_action_at)
  WHERE next_action_at IS NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS activities_tenant_client_occurred_idx
  ON activities (tenant_id, client_id, occurred_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS visits_tenant_client_idx
  ON visits (tenant_id, client_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS visits_tenant_schedule_idx
  ON visits (tenant_id, status, scheduled_at);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS proposals_tenant_deal_created_idx
  ON proposals (tenant_id, deal_id, created_at DESC);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS property_owners_tenant_owner_idx
  ON property_owners (tenant_id, owner_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS property_photos_tenant_property_position_idx
  ON property_photos (tenant_id, property_id, position);
