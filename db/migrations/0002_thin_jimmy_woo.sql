CREATE TYPE "public"."locale" AS ENUM('en', 'pt-BR');--> statement-breakpoint
ALTER TABLE "analyses" ADD COLUMN "locale" "locale" DEFAULT 'en' NOT NULL;