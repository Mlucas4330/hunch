CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"analysis_id" uuid NOT NULL,
	"locale" "locale" DEFAULT 'pt-BR' NOT NULL,
	"unsubscribed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "leads_email_analysis_idx" UNIQUE("email","analysis_id")
);
--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_analysis_id_analyses_id_fk" FOREIGN KEY ("analysis_id") REFERENCES "public"."analyses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "leads_email_idx" ON "leads" USING btree ("email");