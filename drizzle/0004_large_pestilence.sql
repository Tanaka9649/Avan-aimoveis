ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'enviada' BEFORE 'aceita';--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'em_negociacao' BEFORE 'aceita';--> statement-breakpoint
ALTER TYPE "public"."proposal_status" ADD VALUE IF NOT EXISTS 'contraproposta' BEFORE 'aceita';
