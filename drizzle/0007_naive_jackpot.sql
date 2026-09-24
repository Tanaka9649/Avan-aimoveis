CREATE TABLE "opportunity_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"opportunity_id" uuid NOT NULL,
	"storage_key" text NOT NULL,
	"original_name" varchar(240) NOT NULL,
	"display_name" varchar(240) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"category" varchar(60),
	"uploaded_by" uuid,
	"upload_status" varchar(20) DEFAULT 'uploading' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "access" SET DEFAULT '{"modules":["dashboard","imoveis","clientes","crm","visitas","propostas","proprietarios"],"clients":"all"}'::jsonb;--> statement-breakpoint
UPDATE "users"
SET "access" = jsonb_set("access", '{modules}', ("access"->'modules') || '["dashboard"]'::jsonb),
    "updated_at" = now()
WHERE "role" = 'equipe'
  AND NOT ("access"->'modules' ? 'dashboard')
  AND "access"->'modules' @> '["imoveis","clientes","crm","visitas","propostas","proprietarios"]'::jsonb;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "original_name" varchar(240);--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "original_mime" varchar(100);--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "size_bytes" integer;--> statement-breakpoint
ALTER TABLE "property_photos" ADD COLUMN "processing_status" varchar(20) DEFAULT 'ready' NOT NULL;--> statement-breakpoint
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_opportunity_id_deals_id_fk" FOREIGN KEY ("opportunity_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "opportunity_attachments" ADD CONSTRAINT "opportunity_attachments_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "opportunity_attachments_deal_idx" ON "opportunity_attachments" USING btree ("opportunity_id","created_at");
