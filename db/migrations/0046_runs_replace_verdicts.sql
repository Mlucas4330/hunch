CREATE TABLE "analysis_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"analysis_id" uuid,
	"user_id" uuid NOT NULL,
	"measured_at" timestamp,
	"finished_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analysis_runs" ADD CONSTRAINT "analysis_runs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "analysis_runs_user_created_idx" ON "analysis_runs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "analysis_runs_analysis_created_idx" ON "analysis_runs" USING btree ("analysis_id","created_at");--> statement-breakpoint
INSERT INTO "analysis_runs" ("analysis_id", "user_id", "measured_at", "finished_at", "failed_at", "created_at")
SELECT
	a."id",
	a."user_id",
	CASE WHEN a."structure" IS NOT NULL THEN a."created_at" END,
	CASE
		WHEN EXISTS (SELECT 1 FROM "hypotheses" h WHERE h."analysis_id" = a."id")
			OR EXISTS (SELECT 1 FROM "flow_fixes" f WHERE f."analysis_id" = a."id")
		THEN a."created_at"
	END,
	a."failed_at",
	a."created_at"
FROM "analyses" a
WHERE a."user_id" IS NOT NULL;--> statement-breakpoint
ALTER TABLE "analyses" DROP COLUMN "failed_at";--> statement-breakpoint
ALTER TABLE "flow_fixes" DROP COLUMN "verdict";--> statement-breakpoint
ALTER TABLE "flow_fixes" DROP COLUMN "verdict_at";--> statement-breakpoint
ALTER TABLE "hypotheses" DROP COLUMN "verdict";--> statement-breakpoint
ALTER TABLE "hypotheses" DROP COLUMN "verdict_at";--> statement-breakpoint
DROP TYPE "public"."verdict";