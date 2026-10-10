-- Additive property land-area field for houses and land listings.
-- Existing property data is preserved; no backfill or destructive update is performed.
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS lot_area numeric(10,2);
