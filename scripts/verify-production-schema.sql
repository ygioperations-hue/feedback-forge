\set ON_ERROR_STOP on

DO $$
DECLARE
  missing_usage integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'trial_ends_at'
  ) THEN
    RAISE EXCEPTION 'Verification failed: users.trial_ends_at is missing';
  END IF;

  IF to_regclass('public.monthly_usage') IS NULL THEN
    RAISE EXCEPTION 'Verification failed: monthly_usage is missing';
  END IF;

  IF to_regclass('public.growth_checkout_attempts') IS NULL THEN
    RAISE EXCEPTION 'Verification failed: growth_checkout_attempts is missing';
  END IF;

  IF (SELECT count(*) FROM plans WHERE plan_key = 'lifetime') <> 1
     OR (SELECT count(*) FROM plans WHERE plan_key = 'growth_monthly') <> 1
     OR (SELECT count(*) FROM plans) <> 2 THEN
    RAISE EXCEPTION 'Verification failed: expected exactly one Lifetime and one Growth plan';
  END IF;

  IF EXISTS (SELECT 1 FROM plans WHERE plan_key LIKE 'legacy_%')
     OR EXISTS (SELECT 1 FROM users WHERE plan_type IN ('monthly', 'yearly')) THEN
    RAISE EXCEPTION 'Verification failed: legacy billing data remains';
  END IF;

  IF EXISTS (
    SELECT stripe_subscription_id FROM subscriptions
    WHERE stripe_subscription_id IS NOT NULL
    GROUP BY stripe_subscription_id HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Verification failed: duplicate Stripe subscription IDs exist';
  END IF;

  SELECT count(*) INTO missing_usage
  FROM responses r
  JOIN projects p ON p.id = r.project_id
  LEFT JOIN monthly_usage mu ON mu.response_id = r.id
  WHERE p.user_id IS NOT NULL
    AND r.submitted_at >= date_trunc('month', now() AT TIME ZONE 'UTC')
    AND r.submitted_at < date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month'
    AND mu.id IS NULL;

  IF missing_usage <> 0 THEN
    RAISE EXCEPTION 'Verification failed: % retained current-month responses lack usage rows', missing_usage;
  END IF;
END $$;

SELECT plan_key, name, price, interval, stripe_price_id
FROM plans
ORDER BY plan_key;

SELECT kind, status, count(*) AS usage_rows
FROM monthly_usage
GROUP BY kind, status
ORDER BY kind, status;
