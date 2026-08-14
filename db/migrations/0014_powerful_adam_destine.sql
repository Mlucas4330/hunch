ALTER TABLE "analyses" ADD COLUMN "keywords" jsonb;--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "screenshot_overflow" boolean DEFAULT false NOT NULL;