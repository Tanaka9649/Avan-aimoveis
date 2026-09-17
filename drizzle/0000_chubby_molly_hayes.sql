CREATE TYPE "public"."property_status" AS ENUM('rascunho', 'disponivel', 'reservado', 'vendido', 'pausado');--> statement-breakpoint
CREATE TYPE "public"."proposal_status" AS ENUM('aberta', 'aceita', 'recusada', 'expirada');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'equipe');--> statement-breakpoint
CREATE TYPE "public"."visit_status" AS ENUM('agendada', 'realizada', 'cancelada', 'nao_compareceu');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid,
	"client_id" uuid,
	"user_id" uuid,
	"type" varchar(60) NOT NULL,
	"description" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid,
	"action" varchar(80) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(254),
	"origin" varchar(80) NOT NULL,
	"budget_min_cents" integer,
	"budget_max_cents" integer,
	"desired_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"desired_regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"min_bedrooms" integer,
	"min_bathrooms" integer,
	"min_parking_spaces" integer,
	"min_area" numeric(10, 2),
	"desired_features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"lgpd_consent_at" timestamp with time zone,
	"anonymized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deal_properties" (
	"deal_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	CONSTRAINT "deal_properties_deal_id_property_id_pk" PRIMARY KEY("deal_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"stage_id" uuid NOT NULL,
	"title" varchar(180) NOT NULL,
	"estimated_value_cents" integer,
	"position" numeric(20, 10) NOT NULL,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"next_action_at" timestamp with time zone,
	"lost_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"entity_type" varchar(30) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" varchar(160) NOT NULL,
	"body" text NOT NULL,
	"href" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "owners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"phone" varchar(30) NOT NULL,
	"email" varchar(254),
	"tax_id_encrypted" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(30) NOT NULL,
	"title" varchar(180) NOT NULL,
	"slug" varchar(200) NOT NULL,
	"status" "property_status" DEFAULT 'rascunho' NOT NULL,
	"type" varchar(60) NOT NULL,
	"price_cents" integer NOT NULL,
	"condo_cents" integer,
	"iptu_cents" integer,
	"bedrooms" integer DEFAULT 0 NOT NULL,
	"suites" integer DEFAULT 0 NOT NULL,
	"bathrooms" integer DEFAULT 0 NOT NULL,
	"parking_spaces" integer DEFAULT 0 NOT NULL,
	"private_area" numeric(10, 2),
	"description" text NOT NULL,
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"state" varchar(2) NOT NULL,
	"city" varchar(120) NOT NULL,
	"neighborhood" varchar(120) NOT NULL,
	"address_private" text NOT NULL,
	"latitude_private" numeric(10, 7),
	"longitude_private" numeric(10, 7),
	"commission_percent" numeric(5, 2),
	"acquisition_type" varchar(60),
	"acquisition_ends_at" timestamp with time zone,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"original_name" varchar(240) NOT NULL,
	"mime" varchar(100) NOT NULL,
	"size" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_owners" (
	"property_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"ownership_percent" numeric(5, 2),
	CONSTRAINT "property_owners_property_id_owner_id_pk" PRIMARY KEY("property_id","owner_id")
);
--> statement-breakpoint
CREATE TABLE "property_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"storage_path" text NOT NULL,
	"alt" varchar(180) NOT NULL,
	"position" integer NOT NULL,
	"is_cover" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid NOT NULL,
	"visitor_hash" text NOT NULL,
	"viewed_on" timestamp NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"amount_cents" integer NOT NULL,
	"status" "proposal_status" DEFAULT 'aberta' NOT NULL,
	"valid_until" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key_hash" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_ends_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deal_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"proposal_id" uuid,
	"amount_cents" integer NOT NULL,
	"commission_cents" integer NOT NULL,
	"sold_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(254) NOT NULL,
	"filters" jsonb NOT NULL,
	"token_hash" text NOT NULL,
	"confirmed_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(80) NOT NULL,
	"position" integer NOT NULL,
	"color" varchar(20) NOT NULL,
	"is_won" boolean DEFAULT false NOT NULL,
	"is_lost" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(160) NOT NULL,
	"email" varchar(254) NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'equipe' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"deal_id" uuid,
	"assigned_to" uuid,
	"status" "visit_status" DEFAULT 'agendada' NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"reminder_at" timestamp with time zone,
	"reminder_sent_at" timestamp with time zone,
	"feedback" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whatsapp_clicks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"property_id" uuid,
	"visitor_hash" text NOT NULL,
	"source" varchar(50) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_properties" ADD CONSTRAINT "deal_properties_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deal_properties" ADD CONSTRAINT "deal_properties_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deals" ADD CONSTRAINT "deals_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."stages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_documents" ADD CONSTRAINT "property_documents_category_id_document_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."document_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_owners" ADD CONSTRAINT "property_owners_owner_id_owners_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."owners"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_photos" ADD CONSTRAINT "property_photos_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property_views" ADD CONSTRAINT "property_views_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales" ADD CONSTRAINT "sales_proposal_id_proposals_id_fk" FOREIGN KEY ("proposal_id") REFERENCES "public"."proposals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_deal_id_deals_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."deals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visits" ADD CONSTRAINT "visits_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "whatsapp_clicks" ADD CONSTRAINT "whatsapp_clicks_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_timeline_idx" ON "activities" USING btree ("client_id","occurred_at");--> statement-breakpoint
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" USING btree ("entity_type","entity_id","created_at");--> statement-breakpoint
CREATE INDEX "clients_contact_idx" ON "clients" USING btree ("email","phone");--> statement-breakpoint
CREATE INDEX "deals_board_idx" ON "deals" USING btree ("stage_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_code_uq" ON "properties" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "properties_slug_uq" ON "properties" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "properties_search_idx" ON "properties" USING btree ("status","city","type","price_cents");--> statement-breakpoint
CREATE INDEX "property_photos_order_idx" ON "property_photos" USING btree ("property_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "property_views_dedupe_uq" ON "property_views" USING btree ("property_id","visitor_hash","viewed_on");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_deal_uq" ON "sales" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_property_uq" ON "sales" USING btree ("property_id");--> statement-breakpoint
CREATE UNIQUE INDEX "search_alert_token_uq" ON "search_alerts" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_uq" ON "sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stages_position_uq" ON "stages" USING btree ("position");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "visits_schedule_idx" ON "visits" USING btree ("status","scheduled_at");--> statement-breakpoint
CREATE INDEX "whatsapp_clicks_property_idx" ON "whatsapp_clicks" USING btree ("property_id","created_at");