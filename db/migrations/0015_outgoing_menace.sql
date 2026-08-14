CREATE TABLE "page_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"structure" jsonb,
	"seo" jsonb,
	"performance" jsonb,
	"crawler_access" jsonb,
	"keywords" jsonb,
	"score" integer,
	"captured_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "page_snapshots" ADD CONSTRAINT "page_snapshots_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "page_snapshots_analysis_id_captured_at_index" ON "page_snapshots" USING btree ("analysis_id","captured_at");