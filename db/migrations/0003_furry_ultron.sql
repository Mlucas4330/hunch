CREATE TYPE "public"."track_event" AS ENUM('impression', 'conversion');--> statement-breakpoint
CREATE TABLE "experiment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"visitor_id" uuid NOT NULL,
	"arm" "experiment_arm" NOT NULL,
	"type" "track_event" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "experiment_events_experiment_id_visitor_id_arm_type_unique" UNIQUE("experiment_id","visitor_id","arm","type")
);
--> statement-breakpoint
CREATE TABLE "stripe_events" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"subscription_id" text,
	"event_created_at" timestamp NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "experiment_events" ADD CONSTRAINT "experiment_events_experiment_id_experiments_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiments"("id") ON DELETE cascade ON UPDATE no action;