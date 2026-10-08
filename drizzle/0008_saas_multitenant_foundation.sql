-- SaaS multi-tenant foundation: additive, repeatable where practical, and non-destructive.
-- Production requires a Neon restore point and before/after counts documented in docs/saas/MIGRATION_PLAN.md.
DO $$ BEGIN CREATE TYPE global_role AS ENUM ('user','super_admin'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE tenant_status AS ENUM ('configuring','trial','active','suspended','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE membership_role AS ENUM ('owner','admin','manager','agent','viewer'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE membership_status AS ENUM ('invited','active','suspended'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE domain_status AS ENUM ('pending','verifying','active','error'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE provision_status AS ENUM ('pending','running','complete','failed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(180) NOT NULL,
  slug varchar(120) NOT NULL,
  status tenant_status NOT NULL DEFAULT 'configuring',
  plan varchar(40) NOT NULL DEFAULT 'starter',
  phone varchar(30), whatsapp varchar(30), email varchar(254),
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  site jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  quota_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  standard_domain varchar(253), custom_domain varchar(253),
  domain_status domain_status NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uq ON tenants (slug);
CREATE UNIQUE INDEX IF NOT EXISTS tenants_custom_domain_uq ON tenants (custom_domain) WHERE custom_domain IS NOT NULL;

INSERT INTO tenants (id,name,slug,status,plan,branding,site,standard_domain)
VALUES ('00000000-0000-4000-8000-000000000001','Avança Imóveis e Rogério Cortes','avanca-imoveis','active','max',
 '{"logoLight":"/avanca-logo.png","logoDark":"/avanca-logo.png","favicon":"/favicon.svg"}',
 '{"primaryColor":"#1f6feb","secondaryColor":"#111827","accentColor":"#d6a84f","title":"Avança Imóveis e Rogério Cortes"}',
 'imoveisplatform.vercel.app')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS plans (
 code varchar(40) PRIMARY KEY, name varchar(80) NOT NULL, limits jsonb NOT NULL DEFAULT '{}',
 modules jsonb NOT NULL DEFAULT '[]', active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO plans(code,name,limits,modules) VALUES
 ('starter','Starter','{}','["dashboard","imoveis","clientes","crm"]'),
 ('pro','Pro','{}','["dashboard","imoveis","clientes","crm","visitas","propostas","proprietarios","analytics"]'),
 ('max','Max','{}','["dashboard","imoveis","clientes","crm","visitas","propostas","proprietarios","analytics"]'),
 ('custom','Custom','{}','[]')
ON CONFLICT (code) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS global_role global_role NOT NULL DEFAULT 'user';
UPDATE users
SET global_role='super_admin'
WHERE id = (
  SELECT id FROM users
  WHERE role='admin' AND active=TRUE
  ORDER BY created_at ASC, id ASC
  LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM users WHERE global_role='super_admin');

CREATE TABLE IF NOT EXISTS tenant_slug_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 slug varchar(120) NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_slug_history_tenant_idx ON tenant_slug_history(tenant_id);

CREATE TABLE IF NOT EXISTS tenant_memberships (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, role membership_role NOT NULL DEFAULT 'agent',
 status membership_status NOT NULL DEFAULT 'active', permissions jsonb NOT NULL DEFAULT '{}',
 invited_at timestamptz, activated_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(tenant_id,user_id)
);
CREATE INDEX IF NOT EXISTS tenant_memberships_user_idx ON tenant_memberships(user_id,status);
INSERT INTO tenant_memberships(tenant_id,user_id,role,status,permissions,activated_at)
SELECT '00000000-0000-4000-8000-000000000001',id,
 CASE WHEN role='admin' THEN 'owner'::membership_role ELSE 'agent'::membership_role END,
 CASE WHEN active THEN 'active'::membership_status ELSE 'suspended'::membership_status END,
 access, now() FROM users
ON CONFLICT (tenant_id,user_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_invites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 email varchar(254) NOT NULL, name varchar(160) NOT NULL, role membership_role NOT NULL DEFAULT 'agent',
 permissions jsonb NOT NULL DEFAULT '{}', token_hash text NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
 accepted_at timestamptz, invited_by uuid REFERENCES users(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_invites_tenant_email_idx ON tenant_invites(tenant_id,email);

CREATE TABLE IF NOT EXISTS tenant_modules (
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, module varchar(60) NOT NULL,
 enabled boolean NOT NULL DEFAULT true, config jsonb NOT NULL DEFAULT '{}',
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,module)
);
INSERT INTO tenant_modules(tenant_id,module)
SELECT '00000000-0000-4000-8000-000000000001', unnest(ARRAY['dashboard','imoveis','clientes','crm','visitas','propostas','proprietarios','analytics'])
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_provisioning (
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, step varchar(60) NOT NULL,
 status provision_status NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0,
 last_error text, updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,step)
);
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
 actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL, action varchar(100) NOT NULL,
 entity_type varchar(60) NOT NULL, entity_id text, metadata jsonb NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tenant_audit_logs_tenant_created_idx ON tenant_audit_logs(tenant_id,created_at);

CREATE TABLE IF NOT EXISTS analytics_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 property_id uuid REFERENCES properties(id) ON DELETE SET NULL, event_type varchar(40) NOT NULL,
 anonymous_session_id text NOT NULL, utm_source varchar(160), utm_medium varchar(160),
 utm_campaign varchar(160), utm_content varchar(160), utm_term varchar(160), referrer text,
 dedupe_key text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS analytics_events_tenant_created_idx ON analytics_events(tenant_id,created_at);
CREATE INDEX IF NOT EXISTS analytics_events_tenant_property_idx ON analytics_events(tenant_id,property_id,created_at);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_events_dedupe_uq ON analytics_events(tenant_id,dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS analytics_daily (
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE, day date NOT NULL,
 event_type varchar(40) NOT NULL, property_id uuid REFERENCES properties(id) ON DELETE SET NULL,
 total integer NOT NULL DEFAULT 0, unique_visitors integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS analytics_daily_uq ON analytics_daily(tenant_id,day,event_type,property_id) NULLS NOT DISTINCT;

DO $$
DECLARE table_name text;
BEGIN
 FOREACH table_name IN ARRAY ARRAY[
  'reminder_settings','sessions','properties','property_photos','owners','property_owners',
  'document_categories','property_documents','clients','stages','deals','opportunity_attachments',
  'deal_properties','activities','client_favorites','client_property_presentations','visits',
  'proposals','sales','search_alerts','notifications','activity_logs','property_views','whatsapp_clicks'
 ] LOOP
  EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id uuid', table_name);
  EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', table_name, '00000000-0000-4000-8000-000000000001');
  EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', table_name);
  BEGIN
   EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (tenant_id) REFERENCES tenants(id)', table_name, table_name || '_tenant_fk');
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I (tenant_id)', table_name || '_tenant_idx', table_name);
 END LOOP;
END $$;

ALTER TABLE sessions ALTER COLUMN tenant_id SET NOT NULL;
DROP INDEX IF EXISTS properties_code_uq;
DROP INDEX IF EXISTS properties_slug_uq;
DROP INDEX IF EXISTS stages_position_uq;
DROP INDEX IF EXISTS property_views_dedupe_uq;
CREATE UNIQUE INDEX properties_code_uq ON properties(tenant_id,code);
CREATE UNIQUE INDEX properties_slug_uq ON properties(tenant_id,slug);
CREATE UNIQUE INDEX stages_position_uq ON stages(tenant_id,position);
CREATE UNIQUE INDEX property_views_dedupe_uq ON property_views(tenant_id,property_id,visitor_hash,viewed_on);


-- Tenant-local reminder keys replace the legacy global primary key.
ALTER TABLE reminder_settings ALTER COLUMN tenant_id SET NOT NULL;
ALTER TABLE reminder_settings DROP CONSTRAINT IF EXISTS reminder_settings_pkey;
ALTER TABLE reminder_settings ADD CONSTRAINT reminder_settings_pkey PRIMARY KEY (tenant_id, key);
