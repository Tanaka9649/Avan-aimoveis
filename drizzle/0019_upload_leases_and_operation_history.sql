CREATE TABLE "operation_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text NOT NULL,
	"code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "branding_assets" ADD COLUMN "upload_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "branding_assets" ADD COLUMN "upload_expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "opportunity_attachments" ADD COLUMN "upload_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "opportunity_attachments" ADD COLUMN "upload_expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "property_documents" ADD COLUMN "upload_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "property_documents" ADD COLUMN "upload_expired_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "upload_lease_until" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "upload_expired_at" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "operation_run_events_created_idx" ON "operation_run_events" USING btree ("created_at");