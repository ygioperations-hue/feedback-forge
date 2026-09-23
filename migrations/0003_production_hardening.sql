ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_ends_at timestamp;

CREATE TABLE IF NOT EXISTS growth_checkout_attempts (
  user_id varchar PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  attempt_id varchar NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  stripe_session_id text UNIQUE,
  expires_at timestamp NOT NULL,
  created_at timestamp NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM subscriptions s
    JOIN plans p ON p.id = s.plan_id
    WHERE p.plan_key LIKE 'legacy_%'
  ) THEN
    RAISE EXCEPTION 'Cannot remove legacy plans while subscription rows still reference them';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE plan_type IN ('monthly', 'yearly')) THEN
    RAISE EXCEPTION 'Cannot remove legacy plans while users still have monthly or yearly plan types';
  END IF;
END $$;

DELETE FROM plans WHERE plan_key LIKE 'legacy_%';
