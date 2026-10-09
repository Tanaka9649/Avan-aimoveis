-- Owner identity hardening.
-- Existing duplicate owner records are merged without deleting or modifying properties.
-- Property links are re-pointed to the oldest owner record for the same tenant/identity.
CREATE TEMP TABLE owner_merge_map ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    id,
    tenant_id,
    created_at,
    regexp_replace(coalesce(phone, ''), '\\D', '', 'g') AS phone_n,
    lower(trim(coalesce(email, ''))) AS email_n,
    lower(regexp_replace(trim(name), '\\s+', ' ', 'g')) AS name_n
  FROM owners
),
ranked AS (
  SELECT
    *,
    CASE
      WHEN phone_n <> '' THEN 'phone:' || phone_n
      WHEN email_n <> '' THEN 'email:' || email_n
      ELSE 'name:' || name_n
    END AS identity_key,
    row_number() OVER (
      PARTITION BY
        tenant_id,
        CASE
          WHEN phone_n <> '' THEN 'phone:' || phone_n
          WHEN email_n <> '' THEN 'email:' || email_n
          ELSE 'name:' || name_n
        END
      ORDER BY created_at, id
    ) AS rn,
    first_value(id) OVER (
      PARTITION BY
        tenant_id,
        CASE
          WHEN phone_n <> '' THEN 'phone:' || phone_n
          WHEN email_n <> '' THEN 'email:' || email_n
          ELSE 'name:' || name_n
        END
      ORDER BY created_at, id
    ) AS canonical_id
  FROM normalized
)
SELECT tenant_id, id AS duplicate_id, canonical_id
FROM ranked
WHERE rn > 1;
--> statement-breakpoint
INSERT INTO property_owners (tenant_id, property_id, owner_id, ownership_percent)
SELECT po.tenant_id, po.property_id, merge.canonical_id, po.ownership_percent
FROM property_owners po
JOIN owner_merge_map merge
  ON merge.tenant_id = po.tenant_id
 AND merge.duplicate_id = po.owner_id
ON CONFLICT (property_id, owner_id) DO NOTHING;
--> statement-breakpoint
DELETE FROM property_owners po
USING owner_merge_map merge
WHERE po.tenant_id = merge.tenant_id
  AND po.owner_id = merge.duplicate_id;
--> statement-breakpoint
DELETE FROM owners owner
USING owner_merge_map merge
WHERE owner.tenant_id = merge.tenant_id
  AND owner.id = merge.duplicate_id;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_phone_identity_uq
  ON owners (tenant_id, regexp_replace(coalesce(phone, ''), '\\D', '', 'g'))
  WHERE regexp_replace(coalesce(phone, ''), '\\D', '', 'g') <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_email_identity_uq
  ON owners (tenant_id, lower(trim(coalesce(email, ''))))
  WHERE lower(trim(coalesce(email, ''))) <> '';
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS owners_tenant_name_only_identity_uq
  ON owners (tenant_id, lower(regexp_replace(trim(name), '\\s+', ' ', 'g')))
  WHERE regexp_replace(coalesce(phone, ''), '\\D', '', 'g') = ''
    AND lower(trim(coalesce(email, ''))) = '';
