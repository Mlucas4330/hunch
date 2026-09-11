ALTER TYPE "public"."flow_category" ADD VALUE IF NOT EXISTS 'distinctiveness' BEFORE 'indexability';--> statement-breakpoint
ALTER TABLE "credit_transactions" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "leads" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_events" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "variants" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "credit_transactions" CASCADE;--> statement-breakpoint
DROP TABLE "leads" CASCADE;--> statement-breakpoint
DROP TABLE "payment_events" CASCADE;--> statement-breakpoint
DROP TABLE "variants" CASCADE;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "pagespeed" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "failed_at" timestamp;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD COLUMN "pagespeed" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "monthly_quota" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "analyses_user_created_idx" ON "analyses" USING btree ("user_id","created_at");--> statement-breakpoint
ALTER TABLE "flow_fixes" DROP COLUMN "steps";--> statement-breakpoint
DROP TYPE "public"."credit_reason";--> statement-breakpoint
DROP TYPE "public"."variant_author";