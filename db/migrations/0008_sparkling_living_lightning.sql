CREATE TYPE "public"."lead_source" AS ENUM('report', 'contact');--> statement-breakpoint
ALTER TABLE "waitlist" DROP CONSTRAINT "waitlist_email_unique";--> statement-breakpoint
ALTER TABLE "waitlist" ADD COLUMN "source" "lead_source" DEFAULT 'report' NOT NULL;--> statement-breakpoint
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_email_source_unique" UNIQUE("email","source");