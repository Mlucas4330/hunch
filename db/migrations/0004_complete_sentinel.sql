CREATE TYPE "public"."flow_category" AS ENUM('signup_friction', 'cta_placement', 'decision_load', 'objections', 'trust', 'pricing_clarity', 'page_structure');--> statement-breakpoint
CREATE TABLE "flow_fixes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid NOT NULL,
	"category" "flow_category" NOT NULL,
	"title" text NOT NULL,
	"problem" text NOT NULL,
	"steps" jsonb NOT NULL,
	"impact_score" integer NOT NULL,
	"effort_score" integer NOT NULL,
	"evidence" text,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reference_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"name" text NOT NULL,
	"structure" jsonb NOT NULL,
	"copy_digest" text NOT NULL,
	"source" text NOT NULL,
	"scraped_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reference_pages_url_unique" UNIQUE("url")
);
--> statement-breakpoint
ALTER TABLE "flow_fixes" ADD CONSTRAINT "flow_fixes_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;