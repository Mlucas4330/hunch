ALTER TABLE "analyses" ALTER COLUMN "locale" SET DEFAULT 'pt-BR';--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "mobile" jsonb;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD COLUMN "mobile" jsonb;