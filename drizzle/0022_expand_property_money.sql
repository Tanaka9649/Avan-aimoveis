ALTER TABLE "clients" ALTER COLUMN "budget_min_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "clients" ALTER COLUMN "budget_max_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "deals" ALTER COLUMN "estimated_value_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "price_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "condo_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "properties" ALTER COLUMN "iptu_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "advertised_amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "proposals" ALTER COLUMN "counter_amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "advertised_amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "amount_cents" SET DATA TYPE bigint;--> statement-breakpoint
ALTER TABLE "sales" ALTER COLUMN "commission_cents" SET DATA TYPE bigint;