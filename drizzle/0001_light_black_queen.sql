CREATE TABLE "reminder_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"panel" boolean DEFAULT true NOT NULL,
	"email" boolean DEFAULT true NOT NULL,
	"recipients" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "assigned_to" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "access" jsonb DEFAULT '{"modules":["imoveis","clientes","crm","visitas","propostas","proprietarios"],"clients":"all"}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;