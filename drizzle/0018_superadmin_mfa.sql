CREATE TABLE "user_mfa" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"encrypted_secret" text,
	"pending_secret" text,
	"pending_expires_at" timestamp with time zone,
	"enabled_at" timestamp with time zone,
	"last_time_step" integer,
	"recovery_hashes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "mfa_verified_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "user_mfa" ADD CONSTRAINT "user_mfa_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;