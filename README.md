# Civic Tech Radar

A static historical reader for 172 Civic Tech Radar observations, imported from the original tracker through June 19, 2026. This is a self-contained public edition of the existing native TypeScript data platform. It does not run a live monitoring service.

## Run

Node 24 or later:

```sh
npm ci
npm run build
npm run preview
```

The static artifact is `dist/`. Mount its contents at `/data/civic-tech-radar/`; assets and links already include that prefix. No server, database, API key, account or model is required by readers. Build and serve the static export; development mode is not the deployment target.

```sh
npx playwright install chromium firefox webkit
npm run verify
```

Verification includes TypeScript/Astro checks, deterministic real-data reconciliation, malformed input and privacy boundaries, PGlite replay/stage-history tests, static artifact checks, 160 KB gzip initial-route budget, and Chromium/Firefox/WebKit reader, keyboard, mobile, no-JavaScript and axe checks.

## Data boundary

`data/historical-input.json` contains only the public field allowlist: original title, source, source type, actor, stage, observed date, URL and original row number. The private workbook is not copied into this repository. Original file hashes and the stale snapshot's 143-record count are recorded. The full workbook contributes 172 records, a difference of 29. Three historical rows (122–124) have shifted URL columns; this explicit correction is recorded in exported provenance. A watchlist entry without a URL remains unknown.

Original titles can include annotated headlines. They are labeled as historical tracker entries, not verified quotations or current findings. Generated summaries, why-it-matters prose, relevance/confidence judgments, tags, notes, digest text, discovery candidate lists and private raw research are excluded. The source links provide attribution; linked material is not copied or relicensed. No current-source verification or effectiveness claims are made.

Rebuild exports without private originals:

```sh
npm run import:workbook
```

To audit a new original workbook explicitly:

```sh
npm run import:workbook -- /path/to/tracker.xlsx /path/to/legacy.json
```

The importer reads Signals and Sources, validates all retained fields with ArkType, and fails closed on malformed records. Excel table formatting is ignored because historical table references are malformed. Date cells and Excel serial dates normalize to calendar dates. Original rows remain separately traceable; repeated URLs are not erased. Automatic semantic reconciliation, new labels, scoring, persona weighting and inferred actor aliases are deliberately absent.

## Native platform

`packages/data` ports the authored schema, normalization and SQL migrations from source revision `dc289a3`; `docs/source-manifest.json` records imported source hashes. No private Git history, seed playground, environment, live database or research dataset was imported. Runtime validators are enforced in `insertRawEvent` and `deriveFromRawEvent`. Replay is guarded by unique raw-event identity and transactions. Actors use deterministic IDs and unique names; observation IDs and timestamps are input-derived. A later observation updates the current projection while preserving prior observations. Older replays do not overwrite newer state. Equal fetch timestamps use the lexicographically greatest canonical raw-event UUID; the winning UUID is persisted on the projection. The migration reconstructs the same winner from retained observations.

This public snapshot exports only approved historical fields; the private bronze/silver database is never used by the browser. Broader ingestion clients remain in the original private platform and are not needed for this release. Before migrating an existing populated database, audit duplicate actors/observations; the uniqueness migration intentionally fails if inconsistent historical rows need reconciliation.

## Release

`npm run build` writes `dist/release-manifest.json` with sorted file hashes, data revision, original platform revision and initial-route gzip size. It rejects inline JavaScript, source maps, private paths and broken internal URLs. The consuming release wrapper records the public repository commit.

The production host must preserve `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; require-trusted-types-for 'script'; trusted-types 'none'`. HTML includes the equivalent meta policy; the local verification server sends the header. No inline handlers or unsafe-eval are required.

MIT applies to the user's software. Third-party software notices are retained in `THIRD_PARTY_NOTICES.md` and `docs/licenses/`. Original publishers retain rights in their titles and linked source material.
