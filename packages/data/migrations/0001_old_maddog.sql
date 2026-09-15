CREATE TABLE "indicator_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"source_id" text NOT NULL,
	"unit" text NOT NULL,
	"dimension" text NOT NULL,
	"methodology_url" text,
	"cadence" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "indicator_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"definition_id" text NOT NULL,
	"dimension_value" text NOT NULL,
	"period" text NOT NULL,
	"as_of_date" timestamp with time zone NOT NULL,
	"value" numeric(20, 6) NOT NULL,
	"raw_event_id" uuid NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "indicator_observations_unique_measurement" UNIQUE("definition_id","dimension_value","period","as_of_date")
);
--> statement-breakpoint
ALTER TABLE "indicator_definitions" ADD CONSTRAINT "indicator_definitions_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_definition_id_indicator_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."indicator_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "indicator_observations" ADD CONSTRAINT "indicator_observations_raw_event_id_raw_ingestion_events_id_fk" FOREIGN KEY ("raw_event_id") REFERENCES "public"."raw_ingestion_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "indicator_definitions_source_id_idx" ON "indicator_definitions" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "indicator_observations_definition_id_idx" ON "indicator_observations" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "indicator_observations_period_idx" ON "indicator_observations" USING btree ("period");