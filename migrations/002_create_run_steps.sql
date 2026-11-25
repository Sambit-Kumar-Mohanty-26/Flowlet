CREATE TABLE IF NOT EXISTS run_steps (
  id BIGSERIAL PRIMARY KEY,
  run_id BIGINT NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped')),
  input JSONB,
  output JSONB,
  error TEXT,
  duration_ms INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_run_steps_run_position
  ON run_steps (run_id, position);
