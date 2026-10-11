CREATE TYPE "public"."brief_status" AS ENUM('extracted', 'reviewed');--> statement-breakpoint
CREATE TABLE "product_briefs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"price" varchar(50),
	"currency" varchar(10) DEFAULT 'MAD' NOT NULL,
	"brand" varchar(100),
	"features" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"image_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source_url" varchar(2048) NOT NULL,
	"status" "brief_status" DEFAULT 'extracted' NOT NULL,
	"raw_evidence" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_briefs_project_id_unique" UNIQUE("project_id"),
	CONSTRAINT "product_briefs_title_not_blank" CHECK (length(trim("product_briefs"."title")) > 0)
);
--> statement-breakpoint
ALTER TABLE "product_briefs" ADD CONSTRAINT "product_briefs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_briefs_project_id_idx" ON "product_briefs" USING btree ("project_id");