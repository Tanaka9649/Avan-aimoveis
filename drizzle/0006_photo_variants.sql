ALTER TABLE "property_photos" ADD COLUMN "variants" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "blur_data" text;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "width" integer;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "height" integer;