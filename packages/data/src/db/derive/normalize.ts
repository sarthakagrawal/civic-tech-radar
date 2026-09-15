import { createHash } from "node:crypto";
import { type } from "arktype";

/**
 * Deterministic normalization only: no field here is inferred, scored, or
 * classified — every function is a pure, replayable transform of what a
 * source already stated. This is the layer a discovery pipeline and a
 * silver-derivation job both call; neither should reimplement it.
 */

const TRACKING_QUERY_PREFIXES = ["utm_", "fbclid", "gclid", "mc_cid", "mc_eid"];

const UrlInput = type("string");

export function canonicalizeUrl(rawInput: unknown): string {
  const raw = UrlInput.assert(String(rawInput ?? "").trim());
  if (!raw) return "";

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return raw;

  const keptParams = [...parsed.searchParams.entries()]
    .filter(([key]) => !TRACKING_QUERY_PREFIXES.some((prefix) => key.toLowerCase().startsWith(prefix)))
    .sort(([a], [b]) => a.localeCompare(b));

  const search = new URLSearchParams(keptParams).toString();
  const path = parsed.pathname.replace(/\/+$/, "") || "/";

  return `${parsed.protocol}//${parsed.host.toLowerCase()}${path}${search ? `?${search}` : ""}`;
}

export function sha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/**
 * Stable signal identity: the canonical link alone when a usable one exists
 * — not link-plus-date, deliberately. The link is the real-world identity of
 * "this specific announcement/page"; the date is just when it was first
 * observed. Keying on both would mint a new id every time the same signal is
 * re-fetched on a later day, defeating `signal_observations` as a history of
 * one signal rather than a pile of near-duplicates. Falls back to
 * (source, title, first surfaced) only when no usable link exists at all.
 */
export function stableSignalId(input: {
  link?: string | null | undefined;
  source: string;
  title: string;
  firstSurfaced?: string | null | undefined;
}): string {
  const canonicalLink = canonicalizeUrl(input.link ?? "");
  const key = canonicalLink.startsWith("http")
    ? JSON.stringify({ locator: canonicalLink })
    : JSON.stringify({
        source: input.source.trim().toLowerCase(),
        title: input.title.trim().toLowerCase(),
        firstSurfaced: (input.firstSurfaced ?? "").trim(),
      });
  return `signal-${sha256Hex(key)}`;
}

export function stableSourceId(input: { url?: string | null; name: string }): string {
  const canonicalUrl = canonicalizeUrl(input.url ?? "");
  const key = canonicalUrl.startsWith("http") ? canonicalUrl : input.name.trim().toLowerCase();
  return `source-${sha256Hex(key)}`;
}
