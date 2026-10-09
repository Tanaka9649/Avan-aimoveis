-- One-off owner deduplication.
-- SAFETY: this script NEVER deletes or updates rows in properties or property_photos.
-- It only consolidates duplicate owners and their property_owners join rows.
-- Run first on a Neon branch cloned from Production and compare the assertions below.

BEGIN;

CREATE TEMP TABLE owner_dedupe_before ON COMMIT DROP AS
SELECT
  (SELECT count(*)::bigint FROM properties) AS properties,
  (SELECT count(*)::bigint FROM property_photos) AS property_photos,
  (SELECT count(*)::bigint FROM clients) AS clients,
  (SELECT count(*)::bigint FROM deals) AS deals;

CREATE TEMP TABLE owner_dedupe_map ON COMMIT DROP AS
WITH base AS (
  SELECT
    o.id,
    o.tenant_id,
    o.created_at,
    lower(regexp_replace(trim(o.name), '\s+', ' ', 'g')) AS name_norm,
    regexp_replace(coalesce(o.phone, ''), '\D', '', 'g') AS phone_norm,
    lower(trim(coalesce(o.email, ''))) AS email_norm
  FROM owners o
),
keyed AS (
  SELECT *,
    CASE
      WHEN phone_norm <> '' THEN 'phone:' || phone_norm
      WHEN email_norm <> '' THEN 'email:' || email_norm
      ELSE 'name:' || name_norm
    END AS identity_key
  FROM base
),
group_stats AS (
  SELECT
    k.tenant_id,
    k.identity_key,
    count(*)::int AS owner_count,
    count(DISTINCT po.property_id)::int AS property_count
  FROM keyed k
  LEFT JOIN property_owners po
    ON po.tenant_id = k.tenant_id
   AND po.owner_id = k.id
  GROUP BY k.tenant_id, k.identity_key
),
ranked AS (
  SELECT
    k.*,
    first_value(k.id) OVER (
      PARTITION BY k.tenant_id, k.identity_key
      ORDER BY k.created_at, k.id
    ) AS canonical_id
  FROM keyed k
)
SELECT
  r.tenant_id,
  r.id AS duplicate_id,
  r.canonical_id,
  r.identity_key
FROM ranked r
JOIN group_stats g
  ON g.tenant_id = r.tenant_id
 AND g.identity_key = r.identity_key
WHERE r.id <> r.canonical_id
  AND g.owner_count > 1
  AND (
    -- Phone/e-mail identities are strong enough to merge across properties.
    r.identity_key NOT LIKE 'name:%'
    -- Name-only identities are merged only when the group points to one property.
    -- This avoids collapsing two different people who happen to share a name.
    OR g.property_count = 1
  );

-- Ensure each property remains linked to the canonical owner before duplicate links are removed.
INSERT INTO property_owners (tenant_id, property_id, owner_id, ownership_percent)
SELECT
  po.tenant_id,
  po.property_id,
  m.canonical_id,
  po.ownership_percent
FROM property_owners po
JOIN owner_dedupe_map m
  ON m.tenant_id = po.tenant_id
 AND m.duplicate_id = po.owner_id
ON CONFLICT (property_id, owner_id) DO UPDATE
SET ownership_percent = COALESCE(property_owners.ownership_percent, EXCLUDED.ownership_percent);

-- Remove only redundant join rows.
DELETE FROM property_owners po
USING owner_dedupe_map m
WHERE po.tenant_id = m.tenant_id
  AND po.owner_id = m.duplicate_id;

-- Remove only duplicate owner records that no longer have any property link.
DELETE FROM owners o
USING owner_dedupe_map m
WHERE o.tenant_id = m.tenant_id
  AND o.id = m.duplicate_id
  AND NOT EXISTS (
    SELECT 1
    FROM property_owners po
    WHERE po.tenant_id = o.tenant_id
      AND po.owner_id = o.id
  );

DO $$
DECLARE
  before_row record;
  after_properties bigint;
  after_photos bigint;
  after_clients bigint;
  after_deals bigint;
BEGIN
  SELECT * INTO before_row FROM owner_dedupe_before;
  SELECT count(*) INTO after_properties FROM properties;
  SELECT count(*) INTO after_photos FROM property_photos;
  SELECT count(*) INTO after_clients FROM clients;
  SELECT count(*) INTO after_deals FROM deals;

  IF after_properties <> before_row.properties
     OR after_photos <> before_row.property_photos
     OR after_clients <> before_row.clients
     OR after_deals <> before_row.deals THEN
    RAISE EXCEPTION 'Safety assertion failed: operational row counts changed. Transaction will roll back.';
  END IF;
END $$;

COMMIT;

-- Validation queries to run immediately after:
-- SELECT count(*) FROM properties;
-- SELECT count(*) FROM property_photos;
-- SELECT count(*) FROM owners;
-- SELECT count(*) FROM property_owners;
