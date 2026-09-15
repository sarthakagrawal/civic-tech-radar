import { relations } from "drizzle-orm";
import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { ingestionRuns } from "./bronze";
import { sources } from "./silver";

/**
 * Why a candidate source exists, distinct from *whether* it's good — that
 * judgment stays in `sources.status`, decided by a human. This table is
 * the evidence a curator reads to make that call, not a recommendation
 * score: no field here ranks candidates against each other.
 */
export const sourceDiscoverySignals = pgTable(
  "source_discovery_signals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceId: text("source_id")
      .notNull()
      .references(() => sources.id),
    runId: uuid("run_id").references(() => ingestionRuns.id),
    method: text("method", {
      enum: [
        "sitemap_crawl",
        "rss_autodiscovery",
        "outbound_link",
        "opml_directory",
        "manual_tip",
        "llm_research",
        // A structured government API extract (SAM.gov Entity Management
        // API), as opposed to 'llm_research' which is unstructured source
        // discovery. Evidence here is the entity's own registration record,
        // not a research agent's finding.
        "api_extract",
      ],
    }).notNull(),
    // The page or feed that led here, so a curator can verify the chain
    // rather than trust the label.
    evidenceUrl: text("evidence_url").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("source_discovery_signals_source_id_idx").on(table.sourceId),
    index("source_discovery_signals_method_idx").on(table.method),
  ],
);

export const sourceDiscoverySignalsRelations = relations(sourceDiscoverySignals, ({ one }) => ({
  source: one(sources, { fields: [sourceDiscoverySignals.sourceId], references: [sources.id] }),
  run: one(ingestionRuns, { fields: [sourceDiscoverySignals.runId], references: [ingestionRuns.id] }),
}));
