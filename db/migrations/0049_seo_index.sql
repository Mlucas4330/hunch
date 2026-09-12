ALTER TYPE "public"."flow_category" ADD VALUE 'site_health';--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'backlinks';--> statement-breakpoint
ALTER TYPE "public"."flow_category" ADD VALUE 'rankings';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "backlinks" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "ranked_keywords" jsonb;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD COLUMN "backlinks" jsonb;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD COLUMN "ranked_keywords" jsonb;