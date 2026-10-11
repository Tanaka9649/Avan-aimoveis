-- Remove only redundant cumulative snapshots for the nullable property key.
DELETE FROM analytics_daily a USING analytics_daily b
WHERE a.property_id IS NULL AND b.property_id IS NULL
  AND a.tenant_id=b.tenant_id AND a.day=b.day AND a.event_type=b.event_type
  AND (a.total,a.updated_at,a.ctid)<(b.total,b.updated_at,b.ctid);
--> statement-breakpoint
DROP INDEX analytics_daily_uq;
--> statement-breakpoint
CREATE UNIQUE INDEX analytics_daily_uq ON analytics_daily(tenant_id,day,event_type,coalesce(property_id,'00000000-0000-0000-0000-000000000000'::uuid));
--> statement-breakpoint
CREATE FUNCTION retain_analytics(retention_days integer) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE cutoff timestamptz; removed bigint;
BEGIN
  IF retention_days < 30 OR retention_days > 730 THEN RAISE EXCEPTION 'invalid_retention'; END IF;
  PERFORM pg_advisory_xact_lock(1791749001);
  cutoff := (((now() AT TIME ZONE 'America/Sao_Paulo')::date-retention_days)::timestamp AT TIME ZONE 'America/Sao_Paulo');
  LOCK TABLE analytics_events IN SHARE ROW EXCLUSIVE MODE;
  INSERT INTO analytics_daily(tenant_id,day,event_type,property_id,total,unique_visitors,updated_at)
    SELECT tenant_id,(created_at AT TIME ZONE 'America/Sao_Paulo')::date,event_type,property_id,count(*)::int,count(DISTINCT anonymous_session_id)::int,now()
    FROM analytics_events WHERE created_at < date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'
    GROUP BY tenant_id,(created_at AT TIME ZONE 'America/Sao_Paulo')::date,event_type,property_id
    ON CONFLICT(tenant_id,day,event_type,(coalesce(property_id,'00000000-0000-0000-0000-000000000000'::uuid)))
    DO UPDATE SET total=greatest(analytics_daily.total,EXCLUDED.total),unique_visitors=greatest(analytics_daily.unique_visitors,EXCLUDED.unique_visitors),updated_at=now();
  DELETE FROM analytics_events WHERE created_at < cutoff;
  GET DIAGNOSTICS removed=ROW_COUNT;
  DELETE FROM sessions WHERE expires_at < now();
  DELETE FROM password_resets WHERE expires_at < now()-interval '1 day';
  DELETE FROM rate_limits WHERE window_ends_at < now()-interval '1 day';
  RETURN removed;
END $$;
