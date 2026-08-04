CREATE TYPE "public"."hypothesis_target" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"embed_key" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free'::text;--> statement-breakpoint
UPDATE "users" SET "plan" = 'solo' WHERE "plan" = 'team';--> statement-breakpoint
UPDATE "subscriptions" SET "plan" = 'solo' WHERE "plan" = 'team';--> statement-breakpoint
DROP TYPE "public"."subscription_plan";--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'solo');--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free'::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "brief" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "goal_candidates" jsonb;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "research_brief" text;--> statement-breakpoint
ALTER TABLE "experiments" ADD COLUMN "duration_days" integer DEFAULT 14 NOT NULL;--> statement-breakpoint
ALTER TABLE "experiments" ADD COLUMN "ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "target" "hypothesis_target" DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "usage_period_start" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "screenshot_url" text;