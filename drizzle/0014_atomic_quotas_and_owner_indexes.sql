-- Reconcile indexes via a NEW migration. Never rewrite migration 0010 or its journal.
-- If normalized duplicates exist, index creation fails and this transaction rolls back.
DROP INDEX IF EXISTS owners_tenant_phone_identity_uq;
--> statement-breakpoint
DROP INDEX IF EXISTS owners_tenant_name_only_identity_uq;
--> statement-breakpoint
CREATE UNIQUE INDEX owners_tenant_phone_identity_uq
  ON owners (tenant_id, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g'))
  WHERE regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') <> '';
--> statement-breakpoint
-- Serialize quota changes for a tenant. The volatile trigger's queries run after the
-- tenant row lock, so concurrent inserts cannot both consume the last available unit.
CREATE FUNCTION enforce_tenant_resource_quota() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  configured jsonb; overrides jsonb; limit_key text; cap bigint; usage bigint;
  delta bigint := 0; bytes_delta bigint := 0;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.tenant_id <> OLD.tenant_id THEN
    RAISE EXCEPTION 'tenant_move_not_allowed';
  END IF;
  SELECT p.limits, t.quota_overrides INTO configured, overrides
    FROM tenants t LEFT JOIN plans p ON p.code=t.plan WHERE t.id=NEW.tenant_id FOR UPDATE OF t;
  IF NOT FOUND THEN RAISE EXCEPTION 'tenant_not_found'; END IF;
  CASE TG_TABLE_NAME
    WHEN 'properties' THEN limit_key := 'max_properties'; delta := CASE WHEN TG_OP='INSERT' THEN 1 ELSE 0 END;
    WHEN 'clients' THEN limit_key := 'max_clients'; delta := CASE WHEN TG_OP='INSERT' THEN 1 ELSE 0 END;
    WHEN 'deals' THEN limit_key := 'max_opportunities'; delta := CASE WHEN TG_OP='INSERT' THEN 1 ELSE 0 END;
    WHEN 'property_documents' THEN
      limit_key := 'max_documents'; delta := CASE WHEN TG_OP='INSERT' THEN 1 ELSE 0 END;
      bytes_delta := NEW.size - CASE WHEN TG_OP='UPDATE' THEN OLD.size ELSE 0 END;
    WHEN 'opportunity_attachments' THEN
      limit_key := 'max_documents'; delta := CASE WHEN TG_OP='INSERT' THEN 1 ELSE 0 END;
      bytes_delta := NEW.size_bytes - CASE WHEN TG_OP='UPDATE' THEN OLD.size_bytes ELSE 0 END;
    WHEN 'property_photos' THEN bytes_delta := coalesce(NEW.size_bytes,0) - CASE WHEN TG_OP='UPDATE' THEN coalesce(OLD.size_bytes,0) ELSE 0 END;
    WHEN 'branding_assets' THEN bytes_delta := NEW.size_bytes - CASE WHEN TG_OP='UPDATE' THEN OLD.size_bytes ELSE 0 END;
    WHEN 'tenant_invites' THEN
      limit_key := 'max_users';
      delta := CASE WHEN NEW.accepted_at IS NULL AND NEW.expires_at > now() THEN 1 ELSE 0 END;
      IF TG_OP='UPDATE' AND OLD.accepted_at IS NULL AND OLD.expires_at>now() THEN delta := delta-1; END IF;
    WHEN 'tenant_memberships' THEN
      limit_key := 'max_users'; delta := CASE WHEN NEW.status='active' THEN 1 ELSE 0 END;
      IF TG_OP='UPDATE' AND OLD.status='active' THEN delta := delta-1; END IF;
  END CASE;
  IF delta > 0 THEN
    cap := coalesce((overrides->>limit_key)::bigint, (configured->>limit_key)::bigint);
    IF cap IS NOT NULL THEN
      CASE limit_key
        WHEN 'max_properties' THEN SELECT count(*) INTO usage FROM properties WHERE tenant_id=NEW.tenant_id;
        WHEN 'max_clients' THEN SELECT count(*) INTO usage FROM clients WHERE tenant_id=NEW.tenant_id;
        WHEN 'max_opportunities' THEN SELECT count(*) INTO usage FROM deals WHERE tenant_id=NEW.tenant_id;
        WHEN 'max_documents' THEN
          SELECT (SELECT count(*) FROM property_documents WHERE tenant_id=NEW.tenant_id)+(SELECT count(*) FROM opportunity_attachments WHERE tenant_id=NEW.tenant_id) INTO usage;
        WHEN 'max_users' THEN
          SELECT count(*) INTO usage FROM tenant_memberships WHERE tenant_id=NEW.tenant_id AND status='active';
          -- Activation consumes a previously reserved invite; other outstanding invites
          -- are counted when issuing invitations, not twice on activation.
          IF TG_TABLE_NAME='tenant_invites' THEN
            usage := usage + (SELECT count(*) FROM tenant_invites WHERE tenant_id=NEW.tenant_id AND accepted_at IS NULL AND expires_at>now());
          END IF;
      END CASE;
      IF usage+delta>cap THEN RAISE EXCEPTION 'tenant_quota_exceeded:%',limit_key USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  IF bytes_delta>0 THEN
    cap := coalesce((overrides->>'max_storage_bytes')::bigint,(configured->>'max_storage_bytes')::bigint);
    IF cap IS NOT NULL THEN
      SELECT coalesce((SELECT sum(size_bytes) FROM property_photos WHERE tenant_id=NEW.tenant_id),0)
        +coalesce((SELECT sum(size) FROM property_documents WHERE tenant_id=NEW.tenant_id),0)
        +coalesce((SELECT sum(size_bytes) FROM opportunity_attachments WHERE tenant_id=NEW.tenant_id),0)
        +coalesce((SELECT sum(size_bytes) FROM branding_assets WHERE tenant_id=NEW.tenant_id),0) INTO usage;
      IF usage+bytes_delta>cap THEN RAISE EXCEPTION 'tenant_quota_exceeded:max_storage_bytes' USING ERRCODE='23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
DO $$ DECLARE resource text; BEGIN
  FOREACH resource IN ARRAY ARRAY['properties','clients','deals','property_documents','opportunity_attachments','property_photos','branding_assets','tenant_invites','tenant_memberships'] LOOP
    EXECUTE format('CREATE TRIGGER enforce_quota BEFORE INSERT OR UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION enforce_tenant_resource_quota()', resource);
  END LOOP;
END $$;
