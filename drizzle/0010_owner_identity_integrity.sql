-- Owner identity hardening.
-- SAFETY: this migration does not delete or update properties or property_photos.
-- It consolidates only duplicate owner records and their property_owners join rows.
-- Phone/e-mail are strong identities. Name-only duplicates are merged only when the
-- duplicate group is linked to exactly one property, which matches the legacy bug
-- without collapsing two different people who happen to share a name.

CREATE TEMP TABLE owner_identity_before ON COMMIT DROP AS
SELECT
  (SELECT count(*)::bigint FROM properties) AS properties,
  (SELECT count(*)::bigint FROM property_photos) AS property_photos,
  (SELECT count(*)::bigint FROM clients) AS clients,
  (SELECT count(*)::bigint FROM deals) AS deals;
--> statement-breakpoint

CREATE TEMP TABLE owner_merge_map ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    id,
    tenant_id,
    created_at,
    regexp_replace(coalesce(phone, ''), '\D', '', 'g') AS phone_n,
    lower(trim(coalesce(email, ''))) AS email_n,
    lower(regexp_replace(trim(name), '\s+', ' ', 'g')) AS name_n
  FROM owners
),
keyed AS (
  SELECT *,
    CASE
      WHEN phone_n <> '' THEN 'phone:' || phone_n
      WHEN email_n <> '' THEN 'email:' || email_n
      ELSE 'name:' || name_n
    END AS identity_key
  FROM normalized
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
    row_number() OVER (
      PARTITION BY k.tenant_id, k.identity_key
      ORDER BY k.created_at, k.id
    ) AS rn,
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
WHERE r.rn > 1
  AND g.owner_count > 1
  AND (
    r.identity_key NOT LIKE 'name:%'
    OR g.property_count = 1
  );
--> statement-breakpoint

INSERT INTO property_owners (tenant_id, property_id, owner_id, ownership_percent)
SELECT
  po.tenant_id,
  po.property_id,
  merge.canonical_id,
  po.ownership_percent
FROM property_owners po
JOIN owner_merge_map merge
  ON merge.tenant_id = po.tenant_id
 AND merge.duplicate_id = po.owner_id
ON CONFLICT (property_id, owner_id) DO UPDATE
SET ownership_percent = COALESCE(property_owners.ownership_percent, EXCLUDED.ownership_percent);
--> statement-breakpoint

DELETE FROM property_owners po
USING owner_merge_map merge
WHERE po.tenant_id = merge.tenant_id
  AND po.owner_id = merge.duplicate_id;
--> statement-breakpoint

DELETE FROM owners owner
USING owner_merge_map merge
WHERE owner.tenant_id = merge.tenant_id
  AND owner.id = merge.duplicate_id
  AND NOT EXISTS (
    SELECT 1
    FROM property_owners po
    WHERE po.tenant_id = owner.tenant_id
      AND po.owner_id = owner.id
  );
--> statement-breakpoint

-- Database-level protection for strong identities.
CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_phone_identity_uq
  ON owners (tenant_id, regexp_replace(coalesce(phone, ''), '\D', '', 'g'))
  WHERE regexp_replace(coalesce(phone, ''), '\D', '', 'g') <> '';
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_email_identity_uq
  ON owners (tenant_id, lower(trim(coalesce(email, ''))))
  WHERE lower(trim(coalesce(email, ''))) <> '';
--> statement-breakpoint

DO $$
DECLARE
  before_row record;
BEGIN
  SELECT * INTO before_row FROM owner_identity_before;

  IF (SELECT count(*) FROM properties) <> before_row.properties
     OR (SELECT count(*) FROM property_photos) <> before_row.property_photos
     OR (SELECT count(*) FROM clients) <> before_row.clients
     OR (SELECT count(*) FROM deals) <> before_row.deals THEN
    RAISE EXCEPTION 'Owner identity migration safety check failed: operational row counts changed.';
  END IF;
END $$;
