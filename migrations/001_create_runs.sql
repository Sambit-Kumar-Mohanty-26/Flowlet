CREATE TABLE IF NOT EXISTS runs (
  id BIGSERIAL PRIMARY KEY,
  flow_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'filtered', 'failed')),
  payload JSONB NOT NULL,
  started_at TIMESTAMPTZ(3) NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ(3),
  duration_ms INTEGER,
  error TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_flow_started_id
  ON runs (flow_id, started_at DESC, id DESC);
