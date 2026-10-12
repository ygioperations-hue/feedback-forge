ALTER TABLE plans ADD COLUMN IF NOT EXISTS plan_key text;

UPDATE plans SET plan_key = CASE
  WHEN interval = 'lifetime' THEN 'lifetime'
  WHEN interval = 'month' AND lower(name) = 'monthly' THEN 'legacy_monthly'
  WHEN interval = 'year' AND lower(name) = 'yearly' THEN 'legacy_yearly'
  ELSE 'legacy_' || id
END
WHERE plan_key IS NULL;

ALTER TABLE plans ALTER COLUMN plan_key SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS plans_plan_key_unique ON plans (plan_key);

INSERT INTO plans (name, plan_key, price, interval)
VALUES ('Growth', 'growth_monthly', 1900, 'month')
ON CONFLICT (plan_key) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, interval = EXCLUDED.interval;

-- Checkout verification and Stripe webhooks can arrive together. Retain one row
-- per Stripe subscription before enforcing idempotency at the database layer.
DELETE FROM subscriptions older
USING subscriptions newer
WHERE older.stripe_subscription_id IS NOT NULL
  AND older.stripe_subscription_id = newer.stripe_subscription_id
  AND (older.created_at, older.id) < (newer.created_at, newer.id);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_unique
  ON subscriptions (stripe_subscription_id);
