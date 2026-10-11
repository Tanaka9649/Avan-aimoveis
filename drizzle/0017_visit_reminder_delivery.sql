CREATE TABLE visit_reminder_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id),
 visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
 recipient text NOT NULL, sent_at timestamptz, lease_until timestamptz, attempts integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(visit_id,recipient)
);
--> statement-breakpoint
CREATE FUNCTION enqueue_visit_reminders() RETURNS integer LANGUAGE plpgsql AS $$
DECLARE v record; recipient text; delivery uuid; queued integer := 0;
BEGIN
 PERFORM pg_advisory_xact_lock(1791749002);
 FOR v IN SELECT vis.*, t.slug, coalesce(s.panel,true) AS panel_enabled,coalesce(s.email,false) AS email_enabled,coalesce(s.recipients,'[]'::jsonb) AS recipients
   FROM visits vis JOIN tenants t ON t.id=vis.tenant_id
   LEFT JOIN reminder_settings s ON s.tenant_id=t.id AND s.key='visits'
   WHERE t.status IN ('active','trial') AND vis.status='agendada' AND vis.scheduled_at>now() AND vis.scheduled_at<=now()+interval '26 hours'
 LOOP
   IF v.panel_enabled AND v.assigned_to IS NOT NULL AND EXISTS(SELECT 1 FROM tenant_memberships WHERE tenant_id=v.tenant_id AND user_id=v.assigned_to AND status='active') THEN
     delivery:=NULL;
     INSERT INTO visit_reminder_deliveries(tenant_id,visit_id,recipient,sent_at) VALUES(v.tenant_id,v.id,'panel:'||v.assigned_to,now()) ON CONFLICT DO NOTHING RETURNING id INTO delivery;
     IF delivery IS NOT NULL THEN
       INSERT INTO notifications(tenant_id,user_id,title,body,href) VALUES(v.tenant_id,v.assigned_to,'Visita agendada','Confira os detalhes da próxima visita na agenda.','/empresa/'||v.slug||'/painel/visitas');
       queued:=queued+1;
     END IF;
   END IF;
   IF v.email_enabled THEN
     FOR recipient IN SELECT jsonb_array_elements_text(v.recipients) LOOP
       INSERT INTO visit_reminder_deliveries(tenant_id,visit_id,recipient) VALUES(v.tenant_id,v.id,recipient) ON CONFLICT DO NOTHING;
     END LOOP;
   END IF;
 END LOOP;
 RETURN queued;
END $$;
