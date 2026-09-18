ALTER TABLE "proposals" ALTER COLUMN "status" SET DEFAULT 'enviada';--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "property_id" uuid;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "advertised_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN IF NOT EXISTS "counter_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "advertised_amount_cents" integer;--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "commission_percent" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
ALTER TABLE "visits" ADD COLUMN IF NOT EXISTS "notes" text;--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'proposals_property_id_properties_id_fk'
  ) THEN
    ALTER TABLE "proposals"
      ADD CONSTRAINT "proposals_property_id_properties_id_fk"
      FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id")
      ON DELETE no action ON UPDATE no action;
  END IF;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "proposals_property_idx" ON "proposals" USING btree ("property_id","created_at");
