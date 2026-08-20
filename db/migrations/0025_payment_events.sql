CREATE TABLE "payment_events" (
	"provider" text NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"event_created_at" timestamp NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "payment_events_provider_event_id_pk" PRIMARY KEY("provider","event_id")
);
--> statement-breakpoint
INSERT INTO "payment_events" ("provider", "event_id", "type", "event_created_at", "received_at")
SELECT 'stripe', "id", "type", "event_created_at", "received_at" FROM "stripe_events";
--> statement-breakpoint
DROP TABLE "stripe_events";
