DROP TABLE "report_views" CASCADE;--> statement-breakpoint
DROP TABLE "subscriptions" CASCADE;--> statement-breakpoint
DROP TABLE "waitlist" CASCADE;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "plan";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "brand_name";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "brand_logo_url";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "brand_accent";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "analyses_count";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "usage_period_start";--> statement-breakpoint
DROP TYPE "public"."lead_source";--> statement-breakpoint
DROP TYPE "public"."subscription_plan";--> statement-breakpoint
DROP TYPE "public"."subscription_status";