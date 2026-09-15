ALTER TABLE sources ADD COLUMN latest_raw_event_id uuid REFERENCES raw_ingestion_events(id);
