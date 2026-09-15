# Release verification

Verified September 15, 2026 with Node 24.16.0.

- `npm run verify`: passed. Astro/TypeScript: zero errors, warnings or hints.
- Six core tests passed, using the real 172-row public import plus isolated malformed-input fixtures and an in-memory PGlite database.
- Nine browser tests passed across Chromium, Firefox and WebKit: filtering, URL state, sort, radar point navigation, source pages, actor pages, no-JavaScript browsing, keyboard skip navigation, mobile layout at 200% root text and reduced motion. axe WCAG 2 A/AA and 2.1 AA checks reported no violations on the main reader at desktop and enlarged mobile.
- Equal-time conflicting stage/summary/tag observations produce identical complete projections and histories when applied in opposite orders; a replay of the losing event is a no-op. Legacy projection backfill restores that same winner.
- No `_headers` or `_redirects` files are present in `public/` or `dist/`; CSP hosting guidance remains in README.md.
- Static build: 495 HTML pages; 500 hashed artifact files before the manifest itself. Initial route and referenced static assets: 70,055 bytes gzip against a 163,840-byte limit.
- Release scanner checks every prefixed internal URL, rejects inline scripts/handlers, missing asset prefixes, source maps and private path/key patterns. Browser tests run the static export under strict CSP and Trusted Types `none`.
- Real import: 172 observations versus 143 in the stale legacy JSON; 29 additional rows. Latest observed date is June 19, 2026. Original source/actor labels remain unmerged.
- Desktop and enlarged mobile screenshots were visually inspected. Mobile header and download-link overflow and radar point overlap were corrected before the passing run.

Limits: historical external URLs were preserved and syntax-validated, not exhaustively fetched or re-researched. Original titles may contain annotated headlines; the reader explicitly does not present them as quotations or current findings. This edition has no live refresh, subscriptions or scoring. The populated private database was never opened; migration/replay tests use isolated PGlite fixtures. Safari's system default skips links with plain Tab, so the WebKit skip-link check explicitly focuses the link then activates it using Enter.
