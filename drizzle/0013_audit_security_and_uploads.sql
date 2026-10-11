-- Additive authentication and upload state; existing documents remain available.
CREATE TABLE password_resets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  password_version text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX password_resets_token_uq ON password_resets(token_hash);
--> statement-breakpoint
CREATE INDEX password_resets_user_idx ON password_resets(user_id);
--> statement-breakpoint
ALTER TABLE property_documents ADD COLUMN upload_status varchar(20) NOT NULL DEFAULT 'ready';
--> statement-breakpoint

CREATE TABLE branding_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id),
  asset text NOT NULL, mime text NOT NULL, size_bytes integer NOT NULL,
  confirmed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX branding_assets_tenant_asset_uq ON branding_assets(tenant_id,asset);
