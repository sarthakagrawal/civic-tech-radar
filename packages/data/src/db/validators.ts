import { createInsertSchema, createSelectSchema } from "drizzle-arktype";
import { type } from "arktype";
import { rawIngestionEvents } from "./schema/bronze";
import { signalObservations, signals, sources } from "./schema/silver";

/**
 * ArkType schemas generated directly from the table definitions above — the
 * table is the single source of truth for both the SQL shape and the
 * runtime-validated TS type. This is the boundary that matters most: raw
 * extractor output is untrusted until it passes `RawIngestionEventInsert`,
 * and everything the rest of the system reads back out is re-checked against
 * `RawIngestionEventSelect` rather than trusted as `any` off the wire.
 */

export const RawIngestionEventInsert = createInsertSchema(rawIngestionEvents, {
  // The base column is `text`; narrow it here to what a hash actually is,
  // so a malformed extractor fails at the validation boundary instead of
  // tripping the database's CHECK constraint three layers downstream.
  contentHash: type("/^[0-9a-f]{64}$/"),
  sourceUrl: type("string.url"),
});
export const RawIngestionEventSelect = createSelectSchema(rawIngestionEvents);

export const SourceInsert = createInsertSchema(sources, {
  id: type("/^source-[0-9a-f]{64}$/"),
  url: type("string.url"),
});
export const SourceSelect = createSelectSchema(sources);

export const SignalInsert = createInsertSchema(signals, {
  id: type("/^signal-[0-9a-f]{64}$/"),
  // A plain `type(...)` override replaces the field outright, bypassing
  // drizzle-arktype's own nullable/optional wrapping — fine for `id` (never
  // null), wrong for `link` (nullable in the table). Refine through the
  // callback form instead so the generated optionality is preserved and
  // only the string itself is constrained to a URL shape.
  link: (schema) => schema.to("string.url"),
});
export const SignalSelect = createSelectSchema(signals);

export const SignalObservationInsert = createInsertSchema(signalObservations);
export const SignalObservationSelect = createSelectSchema(signalObservations);
