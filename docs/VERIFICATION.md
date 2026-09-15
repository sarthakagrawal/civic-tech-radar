# Release verification

Verified September 15, 2026 with Node 24.16.0.

- `npm run verify`: passed. Astro/TypeScript: zero errors, warnings or hints.
- Six core tests passed, using the real 172-row public import plus isolated malformed-input fixtures and an in-memory PGlite database.
- Twelve browser tests passed across Chromium, Firefox and WebKit: filtering, URL state, sort, radar point navigation, source pages, actor pages, no-JavaScript browsing, keyboard skip navigation, mobile and 720px tablet layout at 200% root text and reduced motion. axe WCAG 2 A/AA and 2.1 AA checks reported no violations on the main reader at desktop and enlarged mobile.
- Equal-time conflicting stage/summary/tag observations produce identical complete projections and histories when applied in opposite orders; a replay of the losing event is a no-op. Legacy projection backfill restores that same winner.
- No `_headers` or `_redirects` files are present in `public/` or `dist/`; CSP hosting guidance remains in README.md.
- Static build: 495 HTML pages; 501 hashed artifact files before the manifest itself. Initial route and referenced static assets: 70,247 bytes gzip against a 163,840-byte limit.
- Release scanner checks every prefixed internal URL, rejects inline scripts/handlers, missing asset prefixes, source maps and private path/key patterns. Browser tests run the static export under strict CSP and Trusted Types `none`.
- Real import: 172 observations versus 143 in the stale legacy JSON; 29 additional rows. Latest observed date is June 19, 2026. Original source/actor labels remain unmerged.
- Desktop and enlarged mobile screenshots were visually inspected. Mobile header and download-link overflow and radar point overlap were corrected before the passing run.

Limits: historical external URLs were preserved and syntax-validated, not exhaustively fetched or re-researched. Original titles may contain annotated headlines; the reader explicitly does not present them as quotations or current findings. This edition has no live refresh, subscriptions or scoring. The populated private database was never opened; migration/replay tests use isolated PGlite fixtures. Safari's system default skips links with plain Tab, so the WebKit skip-link check explicitly focuses the link then activates it using Enter.

## Enlarged tablet regression

The integration audit found text clipping at 720px and 200% text: the desktop hero statistics column stayed 200px wide while its glyphs grew beyond the box, producing a 760px document. A font-relative container breakpoint now reflows the hero and table into their stacked layouts. The regression checks both document width and actual glyph bounds, plus filtering, radar width and axe checks in all three browsers. At the exact audited 720×500 viewport the document is now 720px wide, and the 172 count and its label remain fully visible.

## Version 1.0.2 boundaries

The full public Radar package is runtime-validated before JSON/CSV generation and again when Astro consumes it. Directory filters retain all static links without JavaScript. Missing observed dates are nullable and render “Unknown”; no missing date is guessed. Existing workbook observations are unchanged.

`exports/reconciliation.json` compares retained fields by original worksheet row against an allowlisted copy of the stale JSON. Differences are exact archival values, including malformed old URL cells; they are evidence, never navigation URLs or silently repaired observations. The workbook remains authoritative. This is a row-position comparison, not inferred entity matching.

Native silver signal projections are never hand-edited by contract. Every current extracted signal field now comes from the greatest `(fetchedAt, raw event UUID)` observation. Original per-event annotations remain in `signal_observations`; raw events remain immutable. Sources use the same winner for ingested name/URL/type while earliest first-seen is retained. Curated source status, discovery method, cadence, notes and what-to-pull are untouched. Actor aliases accumulate as a sorted union, retaining existing aliases; creation time is the earliest event. There is no separate manual signal-edit store in the inherited schema, so this code must not be used to preserve undocumented direct edits to silver signals. Existing source records acquire their winner marker on subsequent ingestion; a complete archival rebuild is required to establish full winner evidence for an older database.
