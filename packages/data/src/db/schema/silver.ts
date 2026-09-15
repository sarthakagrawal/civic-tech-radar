import { relations, sql } from "drizzle-orm";
import { check, index, jsonb, pgTable, text, timestamp, uuid, uniqueIndex } from "drizzle-orm/pg-core";
import { rawIngestionEvents } from "./bronze";

/**
 * Silver layer: deterministically derived from bronze, never hand-edited and
 * never the destination of anything AI-scored. `derivation_version` exists so
 * every row states *which* pure function produced it — re-run that function
 * over bronze and the row must reproduce byte-for-byte, or the version is
 * bumped and history says so. Nothing in this file computes a rank, weight,
 * confidence, or persona relevance — those are deliberately absent; see the
 * repo README's "what this does not build" section before adding one.
 */

export const sourceTypes = pgTable("source_types", {
  slug: text("slug").primaryKey(),
  label: text("label").notNull(),
  // A short definition, if one exists — structural metadata about the
  // category itself, not a judgment about any particular source in it.
  description: text("description"),
});

export const sources = pgTable(
  "sources",
  {
    // Content-derived, same as signals below: sha256 over the canonical URL,
    // or the name when no URL is usable yet (a freshly discovered source may
    // only have a name). Deterministic id means re-ingesting the same source
    // is an idempotent upsert, not a select-then-maybe-insert race.
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    // Canonicalized: lowercase host, no tracking params, no trailing slash —
    // see src/db/derive/normalize.ts. Two differently-typed URLs for the same
    // source must canonicalize identically or dedup silently fails.
    url: text("url").notNull(),
    sourceTypeSlug: text("source_type_slug").references(() => sourceTypes.slug),
    cadence: text("cadence"),
    whatToPull: text("what_to_pull"),
    notes: text("notes"),
    // 'discovered' rows come from the persistent discovery pipeline and are
    // not yet curated; only a human promotes 'discovered' -> 'active'. This
    // table is never where AI-max-coverage discovery and human curation are
    // the same step.
    discoveryMethod: text("discovery_method", { enum: ["curated", "discovered"] }).notNull(),
    status: text("status", { enum: ["candidate", "active", "rejected", "retired"] })
      .notNull()
      .default("candidate"),
    firstSeenAt: timestamp("first_seen_at", { withTimezone: true }).notNull().defaultNow(),
    lastCheckedAt: timestamp("last_checked_at", { withTimezone: true }),
    latestRawEventId: uuid("latest_raw_event_id").references(() => rawIngestionEvents.id),
  },
  (table) => [
    index("sources_url_idx").on(table.url),
    index("sources_status_idx").on(table.status),
    check("sources_id_is_sha256", sql`${table.id} ~ '^source-[0-9a-f]{64}$'`),
  ],
);

export const actors = pgTable(
  "actors",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    canonicalName: text("canonical_name").notNull(),
    // Known alternate spellings/abbreviations that resolve to this actor
    // (e.g. "House Digital Service" / "HDS / CAO") — structural
    // normalization, not a claim about the actor's importance.
    aliases: jsonb("aliases").$type<string[]>().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("actors_canonical_name_idx").on(table.canonicalName)],
);

export const signals = pgTable(
  "signals",
  {
    // Content-derived, not random: sha256 over (canonical link, date) or the
    // (source, title, first-surfaced) fallback when no usable link exists.
    // Same input always yields the same id — re-derivation is idempotent by
    // construction, not by a dedup pass after the fact.
    id: text("id").primaryKey(),
    sourceId: text("source_id").references(() => sources.id),
    actorId: uuid("actor_id").references(() => actors.id),
    title: text("title").notNull(),
    summary: text("summary"),
    // Present only when the source text itself states it (e.g. an RSS
    // item's own "why this matters" field, if a source ever ships one) —
    // never a generated interpretation. Most rows will have this null.
    whyItMattersVerbatim: text("why_it_matters_verbatim"),
    link: text("link"),
    dateObserved: timestamp("date_observed", { withTimezone: true }).notNull(),
    firstSurfaced: text("first_surfaced"),
    // Free text on purpose: a stage taxonomy is a domain-modeling call, and
    // this stores whatever the source states, unnormalized, until that
    // taxonomy is deliberately decided rather than defaulted here.
    stage: text("stage"),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    derivationVersion: text("derivation_version").notNull(),
    derivedAt: timestamp("derived_at", { withTimezone: true }).notNull().defaultNow(),
    // Persist the equal-time winner so replay order cannot change current state.
    latestRawEventId: uuid("latest_raw_event_id").references(() => rawIngestionEvents.id),
  },
  (table) => [
    index("signals_source_id_idx").on(table.sourceId),
    index("signals_actor_id_idx").on(table.actorId),
    index("signals_date_observed_idx").on(table.dateObserved),
    check("signals_id_is_sha256", sql`${table.id} ~ '^signal-[0-9a-f]{64}$'`),
  ],
);

/**
 * Every bronze event that touched a signal, in order. This is what the old
 * tracker's RunLog notes were doing by hand ("[stage_change] relative to
 * H.R. 6517") — here it's structural: a signal re-observed with a different
 * `extracted_stage` is a stage change you can query for, not a sentence you
 * have to re-read.
 */
export const signalObservations = pgTable(
  "signal_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signalId: text("signal_id")
      .notNull()
      .references(() => signals.id),
    rawEventId: uuid("raw_event_id")
      .notNull()
      .references(() => rawIngestionEvents.id),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull().defaultNow(),
    // The stage/fields as extracted from *this* observation specifically,
    // even if `signals.stage` has since moved on to a later observation's
    // value. This is the full history; `signals` is the current projection.
    extractedFields: jsonb("extracted_fields").notNull(),
  },
  (table) => [
    index("signal_observations_signal_id_idx").on(table.signalId),
    uniqueIndex("signal_observations_raw_event_id_idx").on(table.rawEventId),
  ],
);

export const sourcesRelations = relations(sources, ({ one, many }) => ({
  sourceType: one(sourceTypes, {
    fields: [sources.sourceTypeSlug],
    references: [sourceTypes.slug],
  }),
  signals: many(signals),
}));

export const actorsRelations = relations(actors, ({ many }) => ({
  signals: many(signals),
}));

export const signalsRelations = relations(signals, ({ one, many }) => ({
  source: one(sources, { fields: [signals.sourceId], references: [sources.id] }),
  actor: one(actors, { fields: [signals.actorId], references: [actors.id] }),
  observations: many(signalObservations),
}));

export const signalObservationsRelations = relations(signalObservations, ({ one }) => ({
  signal: one(signals, { fields: [signalObservations.signalId], references: [signals.id] }),
  rawEvent: one(rawIngestionEvents, {
    fields: [signalObservations.rawEventId],
    references: [rawIngestionEvents.id],
  }),
}));
