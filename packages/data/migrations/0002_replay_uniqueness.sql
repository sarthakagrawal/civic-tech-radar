DROP INDEX IF EXISTS actors_canonical_name_idx;
CREATE UNIQUE INDEX actors_canonical_name_idx ON actors(canonical_name);
DROP INDEX IF EXISTS signal_observations_raw_event_id_idx;
CREATE UNIQUE INDEX signal_observations_raw_event_id_idx ON signal_observations(raw_event_id);
