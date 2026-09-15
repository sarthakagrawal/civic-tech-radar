import { relations } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { rawIngestionEvents } from "./bronze";
import { sources } from "./silver";

/**
 * The time-series counterpart to signals/signal_observations, proposed in
 * docs/quantitative-signals-system.md and built out here. A signal is one
 * discrete happening; an indicator is a number that gets *re-measured* on a
 * schedule, and sources revise their own past periods (a Q2 attrition rate
 * published in July can be restated in October) — so re-observation here is
 * never a diff-and-overwrite the way signal derivation is. Two time axes,
 * same as bronze already separates fetch-time from in-payload dates: the
 * period being measured vs. the date this particular value was observed.
 *
 * Nothing here ranks or weights indicators against each other — that stays
 * out of scope, same as everywhere else in this layer.
 */

export const indicatorDefinitions = pgTable(
  "indicator_definitions",
  {
    // Stable, human-readable slug rather than a generated hash — a
    // definition is authored once by a person/curator reading the
    // publisher's own docs, not derived from a fetched payload the way a
    // signal's id is.
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    unit: text("unit", {
      enum: ["rate", "count", "dollars", "days", "ordinal", "index"],
    }).notNull(),
    // What this is broken out by, in the publisher's own terms — 'agency',
    // 'government-wide', 'sub-agency', etc. Free text on purpose, same
    // reasoning as signals.stage: a fixed dimension taxonomy is a domain
    // call for later, not something to default here.
    dimension: text("dimension").notNull(),
    methodologyUrl: text("methodology_url"),
    cadence: text("cadence", {
      enum: ["daily", "monthly", "quarterly", "annual", "biennial", "quadrennial", "irregular"],
    }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("indicator_definitions_source_id_idx").on(table.sourceId)],
);

export const indicatorObservations = pgTable(
  "indicator_observations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    definitionId: text("definition_id")
      .notNull()
      .references(() => indicatorDefinitions.id),
    // The dimension value this row is for — an agency name, or the literal
    // string 'government-wide' for an ungrouped series.
    dimensionValue: text("dimension_value").notNull(),
    // The period being measured (the publisher's own label for it —
    // "2026-Q2", "FY2025", a plain year), distinct from asOfDate below.
    period: text("period").notNull(),
    // When THIS value was observed/published — not when the period ended.
    // A later re-fetch with a revised value for the same period gets a new
    // row with a later asOfDate, never an overwrite of the earlier one.
    asOfDate: timestamp("as_of_date", { withTimezone: true }).notNull(),
    // Exact decimal, never float — a restated government figure shouldn't
    // pick up floating-point drift on the way into this table.
    value: numeric("value", { precision: 20, scale: 6 }).notNull(),
    rawEventId: uuid("raw_event_id")
      .notNull()
      .references(() => rawIngestionEvents.id),
    // Any qualifier the source itself states verbatim (e.g. "provisional",
    // "preliminary, subject to revision") — never Claude's own annotation.
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("indicator_observations_definition_id_idx").on(table.definitionId),
    index("indicator_observations_period_idx").on(table.period),
    // The real idempotency boundary: don't duplicate a row for the exact
    // same (definition, dimension, period, as-of-date) tuple on a re-fetch
    // before the next genuine update. A *changed* value at a *new*
    // as-of-date for the same period is a wanted revision row, not a
    // conflict — this constraint only blocks re-inserting the identical
    // measurement twice.
    unique("indicator_observations_unique_measurement").on(
      table.definitionId,
      table.dimensionValue,
      table.period,
      table.asOfDate,
    ),
  ],
);

export const indicatorDefinitionsRelations = relations(indicatorDefinitions, ({ one, many }) => ({
  source: one(sources, { fields: [indicatorDefinitions.sourceId], references: [sources.id] }),
  observations: many(indicatorObservations),
}));

export const indicatorObservationsRelations = relations(indicatorObservations, ({ one }) => ({
  definition: one(indicatorDefinitions, {
    fields: [indicatorObservations.definitionId],
    references: [indicatorDefinitions.id],
  }),
  rawEvent: one(rawIngestionEvents, {
    fields: [indicatorObservations.rawEventId],
    references: [rawIngestionEvents.id],
  }),
}));
