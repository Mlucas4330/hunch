CREATE TABLE "report_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"embed_key" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "report_views" ADD CONSTRAINT "report_views_embed_key_analyses_embed_key_fk" FOREIGN KEY ("embed_key") REFERENCES "public"."analyses"("embed_key") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "report_views_embed_key_idx" ON "report_views" USING btree ("embed_key");