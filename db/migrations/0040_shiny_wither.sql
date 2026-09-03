CREATE TYPE "public"."variant_author" AS ENUM('model', 'owner');--> statement-breakpoint
ALTER TABLE "variants" ADD COLUMN "author" "variant_author" DEFAULT 'model' NOT NULL;