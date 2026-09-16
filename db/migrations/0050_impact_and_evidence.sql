ALTER TABLE "analyses" ADD COLUMN "mobile_screenshot_url" text;--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "agency_note" text;--> statement-breakpoint
ALTER TABLE "flow_fixes" ADD COLUMN "business_impact" text;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "business_impact" text;--> statement-breakpoint
ALTER TABLE "hypotheses" ADD COLUMN "element_rect" jsonb;--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD COLUMN "mobile_screenshot_url" text;