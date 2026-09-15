CREATE TABLE "ingestion_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"status" text DEFAULT 'running' NOT NULL,
	"sources_checked" integer DEFAULT 0 NOT NULL,
	"events_ingested" integer DEFAULT 0 NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "raw_ingestion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"run_id" uuid NOT NULL,
	"source_id" text,
	"source_url" text NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"http_status" integer,
	"content_type" text,
	"extraction_method" text NOT NULL,
	"content_hash" text NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "raw_ingestion_events_content_hash_sha256" CHECK (char_length("raw_ingestion_events"."content_hash") = 64)
);
--> statement-breakpoint
CREATE TABLE "source_discovery_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_id" text NOT NULL,
	"run_id" uuid,
	"method" text NOT NULL,
	"evidence_url" text NOT NULL,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "actors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"canonical_name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signal_observations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signal_id" text NOT NULL,
	"raw_event_id" uuid NOT NULL,
	"observed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"extracted_fields" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" text PRIMARY KEY NOT NULL,
	"source_id" text,
	"actor_id" uuid,
	"title" text NOT NULL,
	"summary" text,
	"why_it_matters_verbatim" text,
	"link" text,
	"date_observed" timestamp with time zone NOT NULL,
	"first_surfaced" text,
	"stage" text,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"derivation_version" text NOT NULL,
	"derived_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signals_id_is_sha256" CHECK ("signals"."id" ~ '^signal-[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "source_types" (
	"slug" text PRIMARY KEY NOT NULL,
	"label" text NOT NULL,
	"description" text
);
--> statement-breakpoint
CREATE TABLE "sources" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"url" text NOT NULL,
	"source_type_slug" text,
	"cadence" text,
	"what_to_pull" text,
	"notes" text,
	"discovery_method" text NOT NULL,
	"status" text DEFAULT 'candidate' NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_checked_at" timestamp with time zone,
	CONSTRAINT "sources_id_is_sha256" CHECK ("sources"."id" ~ '^source-[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "raw_ingestion_events" ADD CONSTRAINT "raw_ingestion_events_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_discovery_signals" ADD CONSTRAINT "source_discovery_signals_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "source_discovery_signals" ADD CONSTRAINT "source_discovery_signals_run_id_ingestion_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."ingestion_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_observations" ADD CONSTRAINT "signal_observations_signal_id_signals_id_fk" FOREIGN KEY ("signal_id") REFERENCES "public"."signals"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signal_observations" ADD CONSTRAINT "signal_observations_raw_event_id_raw_ingestion_events_id_fk" FOREIGN KEY ("raw_event_id") REFERENCES "public"."raw_ingestion_events"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signals" ADD CONSTRAINT "signals_actor_id_actors_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."actors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sources" ADD CONSTRAINT "sources_source_type_slug_source_types_slug_fk" FOREIGN KEY ("source_type_slug") REFERENCES "public"."source_types"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "raw_ingestion_events_content_hash_idx" ON "raw_ingestion_events" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "raw_ingestion_events_source_url_idx" ON "raw_ingestion_events" USING btree ("source_url");--> statement-breakpoint
CREATE INDEX "raw_ingestion_events_run_id_idx" ON "raw_ingestion_events" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "source_discovery_signals_source_id_idx" ON "source_discovery_signals" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "source_discovery_signals_method_idx" ON "source_discovery_signals" USING btree ("method");--> statement-breakpoint
CREATE INDEX "actors_canonical_name_idx" ON "actors" USING btree ("canonical_name");--> statement-breakpoint
CREATE INDEX "signal_observations_signal_id_idx" ON "signal_observations" USING btree ("signal_id");--> statement-breakpoint
CREATE INDEX "signal_observations_raw_event_id_idx" ON "signal_observations" USING btree ("raw_event_id");--> statement-breakpoint
CREATE INDEX "signals_source_id_idx" ON "signals" USING btree ("source_id");--> statement-breakpoint
CREATE INDEX "signals_actor_id_idx" ON "signals" USING btree ("actor_id");--> statement-breakpoint
CREATE INDEX "signals_date_observed_idx" ON "signals" USING btree ("date_observed");--> statement-breakpoint
CREATE INDEX "sources_url_idx" ON "sources" USING btree ("url");--> statement-breakpoint
CREATE INDEX "sources_status_idx" ON "sources" USING btree ("status");