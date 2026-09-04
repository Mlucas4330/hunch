ALTER TABLE "leads" ADD COLUMN "unsubscribe_token" uuid DEFAULT gen_random_uuid() NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "stage" smallint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "last_emailed_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD COLUMN "consented_at" timestamp;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_unsubscribe_token_unique" UNIQUE("unsubscribe_token");