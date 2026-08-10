ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free'::text;--> statement-breakpoint
UPDATE "users" SET "plan" = 'pro' WHERE "plan" = 'solo';--> statement-breakpoint
UPDATE "subscriptions" SET "plan" = 'pro' WHERE "plan" = 'solo';--> statement-breakpoint
DROP TYPE "public"."subscription_plan";--> statement-breakpoint
CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro');--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DEFAULT 'free'::"public"."subscription_plan";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan" USING "plan"::"public"."subscription_plan";