CREATE TYPE "public"."verdict" AS ENUM('applied', 'dismissed');--> statement-breakpoint
ALTER TABLE "flow_fixes" ADD COLUMN "verdict" "verdict";--> statement-breakpoint
ALTER TABLE "flow_fixes" ADD COLUMN "verdict_at" timestamp;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "verdict" "verdict";--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "verdict_at" timestamp;