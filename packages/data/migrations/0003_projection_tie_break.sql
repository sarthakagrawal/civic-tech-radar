ALTER TABLE signals ADD COLUMN latest_raw_event_id uuid REFERENCES raw_ingestion_events(id);

-- Reconstruct the winning mutable projection from retained observations.
-- Legacy equal-time records may have been applied in either order.
WITH winners AS (
  SELECT DISTINCT ON (o.signal_id)
    o.signal_id, o.raw_event_id, e.fetched_at, o.extracted_fields
  FROM signal_observations o
  JOIN raw_ingestion_events e ON e.id = o.raw_event_id
  ORDER BY o.signal_id, e.fetched_at DESC, o.raw_event_id DESC
)
UPDATE signals s SET
  latest_raw_event_id = w.raw_event_id,
  derived_at = w.fetched_at,
  stage = w.extracted_fields ->> 'stage',
  summary = w.extracted_fields ->> 'summary',
  why_it_matters_verbatim = w.extracted_fields ->> 'whyItMattersVerbatim',
  tags = COALESCE(w.extracted_fields -> 'tags', '[]'::jsonb),
  derivation_version = 'deterministic-v3'
FROM winners w WHERE s.id = w.signal_id;
