import { relations, sql } from "drizzle-orm";
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Bronze layer: the raw, immutable record of every fetch. Nothing here is
 * ever UPDATEd or DELETEd — a bad extraction is corrected by re-deriving
 * silver from a *new* bronze row, never by mutating an old one. This is the
 * layer that makes "expand the schema at ingestion to capture everything
 * deterministically extractable" true without having to predict every future
 * field: `raw_payload` holds the verbatim response, so a silver-layer schema
 * change can re-derive from history instead of losing anything not
 * anticipated at ingestion time.
 */

export const ingestionRuns = pgTable("ingestion_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  // 'sam_gov_extract' covers the SAM.gov Entity Management API async-extract
  // pipeline (src/scripts/ingest-sam-entities.ts) — distinct from 'discovery'
  // (LLM-driven source-list research) because this run pulls structured
  // registration records from a government API, not candidate URLs.
  trigger: text("trigger", { enum: ["scheduled", "manual", "backfill", "discovery", "sam_gov_extract"] }).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  status: text("status", { enum: ["running", "succeeded", "failed", "partial"] })
    .notNull()
    .default("running"),
  sourcesChecked: integer("sources_checked").notNull().default(0),
  eventsIngested: integer("events_ingested").notNull().default(0),
  // Free-text run notes are a deliberate carryover from the old tracker's
  // RunLog sheet: "what was checked, what was quiet, what was held back and
  // why" turned out to be as valuable as the structured rows. Don't drop it
  // for being unstructured.
  notes: text("notes"),
});

export const rawIngestionEvents = pgTable(
  "raw_ingestion_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    runId: uuid("run_id")
      .notNull()
      .references(() => ingestionRuns.id),
    // Nullable, and deliberately not a foreign key: bronze must be writable
    // before silver has resolved which source (if any) this belongs to, and
    // bronze never depends on silver. Same id shape as sources.id
    // (`source-<sha256>`) so the derivation job can match on it once
    // resolved, without a schema-level dependency in either direction.
    sourceId: text("source_id"),
    sourceUrl: text("source_url").notNull(),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),
    httpStatus: integer("http_status"),
    contentType: text("content_type"),
    extractionMethod: text("extraction_method", {
      enum: ["rss", "sitemap", "html", "api", "manual", "llm_research"],
    }).notNull(),
    // SHA-256 of the raw response body, for idempotent re-fetch detection
    // and as the input to every downstream stable-id derivation.
    contentHash: text("content_hash").notNull(),
    // Verbatim payload: full parsed RSS item / API JSON object / extracted
    // HTML fields, whatever the extractor produced. This is the "capture
    // everything deterministic" field — schema-on-read, not schema-on-write.
    rawPayload: jsonb("raw_payload").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("raw_ingestion_events_content_hash_idx").on(table.contentHash),
    index("raw_ingestion_events_source_url_idx").on(table.sourceUrl),
    index("raw_ingestion_events_run_id_idx").on(table.runId),
    check("raw_ingestion_events_content_hash_sha256", sql`char_length(${table.contentHash}) = 64`),
  ],
);

export const ingestionRunsRelations = relations(ingestionRuns, ({ many }) => ({
  events: many(rawIngestionEvents),
}));

export const rawIngestionEventsRelations = relations(rawIngestionEvents, ({ one }) => ({
  run: one(ingestionRuns, {
    fields: [rawIngestionEvents.runId],
    references: [ingestionRuns.id],
  }),
}));

