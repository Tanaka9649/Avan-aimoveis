CREATE TABLE "client_favorites" (
	"client_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "client_favorites_client_id_property_id_pk" PRIMARY KEY("client_id","property_id")
);
--> statement-breakpoint
CREATE TABLE "client_property_presentations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"client_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"user_id" uuid,
	"channel" varchar(40) NOT NULL,
	"presented_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "next_action_type" varchar(80);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "next_action_note" varchar(500);--> statement-breakpoint
ALTER TABLE "deals" ADD COLUMN "stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_favorites" ADD CONSTRAINT "client_favorites_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_property_presentations" ADD CONSTRAINT "client_property_presentations_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_property_presentations" ADD CONSTRAINT "client_property_presentations_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_property_presentations" ADD CONSTRAINT "client_property_presentations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "client_favorites_property_idx" ON "client_favorites" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "client_presentations_idx" ON "client_property_presentations" USING btree ("client_id","presented_at");--> statement-breakpoint
CREATE INDEX "property_presentations_idx" ON "client_property_presentations" USING btree ("property_id","presented_at");--> statement-breakpoint
CREATE INDEX "deals_next_action_idx" ON "deals" USING btree ("next_action_at");