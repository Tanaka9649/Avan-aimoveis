-- 0014 already reconciled the physical index. This migration aligns Drizzle's
-- snapshot with that state and verifies it WITHOUT rebuilding an applied index.
-- Historical SQL and journal hashes (including 0010) remain unchanged.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
    AND indexname='owners_tenant_phone_identity_uq' AND indexdef LIKE '%[^0-9]%') THEN
    RAISE EXCEPTION 'owner_schema_reconciliation_required:verify_0014';
  END IF;
  IF to_regclass('public.owners_tenant_name_only_identity_uq') IS NOT NULL THEN
    RAISE EXCEPTION 'owner_schema_reconciliation_required:legacy_name_index';
  END IF;
END $$;
