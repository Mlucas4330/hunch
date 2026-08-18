DROP TABLE "experiment_events" CASCADE;--> statement-breakpoint
DROP TABLE "experiment_stats" CASCADE;--> statement-breakpoint
DROP TABLE "experiments" CASCADE;--> statement-breakpoint
ALTER TABLE "hypotheses" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "variants" DROP COLUMN "status";--> statement-breakpoint
DROP TYPE "public"."experiment_arm";--> statement-breakpoint
DROP TYPE "public"."experiment_status";--> statement-breakpoint
DROP TYPE "public"."hypothesis_status";--> statement-breakpoint
DROP TYPE "public"."track_event";--> statement-breakpoint
DROP TYPE "public"."variant_status";