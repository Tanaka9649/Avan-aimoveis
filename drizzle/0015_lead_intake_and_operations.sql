-- Tenant-aware lead intake, serialized before lookup to avoid duplicate clients.
CREATE FUNCTION intake_property_lead(property_uuid uuid, contact_name text, contact_phone text, contact_email text, contact_message text)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE p record; client_uuid uuid; deal_uuid uuid; stage_uuid uuid; normalized text;
BEGIN
  SELECT prop.*, t.status AS tenant_status INTO p FROM properties prop JOIN tenants t ON t.id=prop.tenant_id
    WHERE prop.id=property_uuid FOR UPDATE OF t;
  IF NOT FOUND OR p.tenant_status NOT IN ('active','trial') OR p.status<>'disponivel' OR p.published_at IS NULL THEN RETURN NULL; END IF;
  normalized := regexp_replace(contact_phone,'[^0-9]','','g');
  IF length(normalized) IN (10,11) THEN normalized := '55'||normalized; END IF;
  SELECT c.id INTO client_uuid FROM clients c WHERE c.tenant_id=p.tenant_id AND c.anonymized_at IS NULL AND (
    CASE WHEN length(regexp_replace(c.phone,'[^0-9]','','g')) IN (10,11) THEN '55'||regexp_replace(c.phone,'[^0-9]','','g') ELSE regexp_replace(c.phone,'[^0-9]','','g') END = normalized
    OR lower(c.email)=lower(contact_email)) ORDER BY c.created_at,c.id LIMIT 1;
  IF client_uuid IS NULL THEN
    INSERT INTO clients(tenant_id,name,phone,email,origin,lgpd_consent_at) VALUES(p.tenant_id,contact_name,normalized,lower(contact_email),'site',now()) RETURNING id INTO client_uuid;
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
--> statement-breakpoint
CREATE TABLE operation_runs (
  name text PRIMARY KEY, succeeded_at timestamptz, failed_at timestamptz,
  status text NOT NULL DEFAULT 'pending', updated_at timestamptz NOT NULL DEFAULT now()
);
-- A stable report records configuration and executions, without storing tokens or payloads.
