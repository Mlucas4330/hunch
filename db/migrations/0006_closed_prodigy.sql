CREATE TYPE "public"."fix_kind" AS ENUM('flow', 'visibility');--> statement-breakpoint
CREATE TYPE "public"."market" AS ENUM('us', 'br');--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'indexability';--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'metadata';--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'structured_data';--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'ai_answerability';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "market" "market" DEFAULT 'us' NOT NULL;--> statement-breakpoint
ALTER TABLE "flow_fixes" ADD COLUMN "kind" "fix_kind" DEFAULT 'flow' NOT NULL;