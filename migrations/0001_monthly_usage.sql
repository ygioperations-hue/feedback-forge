CREATE TABLE IF NOT EXISTS monthly_usage (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  status text NOT NULL DEFAULT 'complete',
  response_id varchar UNIQUE,
  occurred_at timestamp NOT NULL DEFAULT now()
);

ALTER TABLE monthly_usage ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'complete';

CREATE INDEX IF NOT EXISTS monthly_usage_user_date_idx
  ON monthly_usage (user_id, occurred_at);

-- Idempotent backfill of the current UTC month.
INSERT INTO monthly_usage (user_id, kind, response_id, occurred_at)
SELECT p.user_id, 'response', r.id, r.submitted_at
FROM responses r
JOIN projects p ON p.id = r.project_id
WHERE p.user_id IS NOT NULL
  AND r.submitted_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
  AND r.submitted_at < date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
ON CONFLICT (response_id) DO NOTHING;
