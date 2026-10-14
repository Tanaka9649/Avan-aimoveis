-- Additive guards; existing contacts/photos are neither merged nor removed.
CREATE FUNCTION audit_contact_phone(value text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE WHEN length(n) IN (10,11) THEN '55'||n ELSE n END FROM (SELECT regexp_replace(coalesce(value,''),'[^0-9]','','g') n) s
$$;
--> statement-breakpoint
CREATE FUNCTION guard_client_contact_identity() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.anonymized_at IS NOT NULL THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.phone IS NOT DISTINCT FROM OLD.phone AND NEW.email IS NOT DISTINCT FROM OLD.email THEN RETURN NEW; END IF;
  PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM clients c WHERE c.tenant_id=NEW.tenant_id AND c.id<>NEW.id AND c.anonymized_at IS NULL AND (
    (audit_contact_phone(NEW.phone)<>'' AND audit_contact_phone(c.phone)=audit_contact_phone(NEW.phone))
    OR (nullif(lower(trim(NEW.email)),'') IS NOT NULL AND lower(trim(c.email))=lower(trim(NEW.email)))
  )) THEN RAISE EXCEPTION 'client_contact_duplicate' USING ERRCODE='23505',CONSTRAINT='clients_contact_identity_guard'; END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER clients_contact_identity_guard BEFORE INSERT OR UPDATE OF phone,email ON clients FOR EACH ROW EXECUTE FUNCTION guard_client_contact_identity();
--> statement-breakpoint
CREATE FUNCTION guard_property_photo_count() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW.property_id=OLD.property_id AND NEW.tenant_id=OLD.tenant_id THEN RETURN NEW; END IF;
  PERFORM id FROM tenants WHERE id=NEW.tenant_id FOR UPDATE;
  IF (SELECT count(*) FROM property_photos WHERE tenant_id=NEW.tenant_id AND property_id=NEW.property_id AND id<>NEW.id)>=10 THEN
    RAISE EXCEPTION 'property_photo_limit:10';
  END IF;
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER property_photos_count_guard BEFORE INSERT OR UPDATE OF property_id,tenant_id ON property_photos FOR EACH ROW EXECUTE FUNCTION guard_property_photo_count();
--> statement-breakpoint
-- A repeat with the same identity is idempotent. Ambiguous/shared contact details require review.
CREATE OR REPLACE FUNCTION intake_property_lead(property_uuid uuid, contact_name text, contact_phone text, contact_email text, contact_message text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE p record; existing record; candidates integer; client_uuid uuid; deal_uuid uuid; stage_uuid uuid; normalized text;
BEGIN
  SELECT prop.*,t.status AS tenant_status INTO p FROM properties prop JOIN tenants t ON t.id=prop.tenant_id
    WHERE prop.id=property_uuid FOR UPDATE OF t;
  IF NOT FOUND OR p.tenant_status NOT IN ('active','trial') OR p.status<>'disponivel' OR p.published_at IS NULL THEN RETURN NULL; END IF;
  normalized:=audit_contact_phone(contact_phone);
  SELECT count(*) INTO candidates FROM clients c WHERE c.tenant_id=p.tenant_id AND c.anonymized_at IS NULL AND (
    audit_contact_phone(c.phone)=normalized OR (nullif(lower(trim(contact_email)),'') IS NOT NULL AND lower(trim(c.email))=lower(trim(contact_email))));
  IF candidates>1 THEN RAISE EXCEPTION 'lead_contact_conflict'; END IF;
  IF candidates=1 THEN
    SELECT c.* INTO existing FROM clients c WHERE c.tenant_id=p.tenant_id AND c.anonymized_at IS NULL AND (
      audit_contact_phone(c.phone)=normalized OR (nullif(lower(trim(contact_email)),'') IS NOT NULL AND lower(trim(c.email))=lower(trim(contact_email)))) LIMIT 1;
    IF lower(trim(existing.name))<>lower(trim(contact_name)) OR audit_contact_phone(existing.phone)<>normalized
      OR coalesce(lower(trim(existing.email)),'')<>coalesce(lower(trim(contact_email)),'') THEN RAISE EXCEPTION 'lead_contact_conflict'; END IF;
    client_uuid:=existing.id;
  ELSE
    INSERT INTO clients(tenant_id,name,phone,email,origin,lgpd_consent_at)
      VALUES(p.tenant_id,contact_name,normalized,nullif(lower(trim(contact_email)),''),'site',now()) RETURNING id INTO client_uuid;
  END IF;
  SELECT d.id INTO deal_uuid FROM deals d JOIN stages s ON s.id=d.stage_id AND s.tenant_id=d.tenant_id
    JOIN deal_properties dp ON dp.deal_id=d.id AND dp.tenant_id=d.tenant_id
    WHERE d.tenant_id=p.tenant_id AND d.client_id=client_uuid AND dp.property_id=property_uuid AND NOT s.is_won AND NOT s.is_lost LIMIT 1;
  IF deal_uuid IS NULL THEN
    SELECT id INTO stage_uuid FROM stages WHERE tenant_id=p.tenant_id AND NOT is_won AND NOT is_lost ORDER BY position LIMIT 1;
    IF stage_uuid IS NULL THEN RAISE EXCEPTION 'no_open_stage'; END IF;
    INSERT INTO deals(tenant_id,client_id,stage_id,title,estimated_value_cents,position,tags)
      VALUES(p.tenant_id,client_uuid,stage_uuid,left('Interesse — '||p.title,180),p.price_cents,1000,'["site","novo-lead"]') RETURNING id INTO deal_uuid;
    INSERT INTO deal_properties(tenant_id,deal_id,property_id) VALUES(p.tenant_id,deal_uuid,property_uuid);
  END IF;
  INSERT INTO activities(tenant_id,deal_id,client_id,type,description)
    VALUES(p.tenant_id,deal_uuid,client_uuid,'lead_recebido',coalesce(nullif(contact_message,''),'Interesse enviado pelo site'));
  RETURN deal_uuid;
END $$;
