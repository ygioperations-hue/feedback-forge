\set ON_ERROR_STOP on

SELECT current_database() AS database_name, current_setting('TimeZone') AS database_timezone;

SELECT CASE
         WHEN interval = 'lifetime' THEN 'lifetime'
         WHEN interval = 'month' AND lower(name) = 'monthly' THEN 'legacy_monthly'
         WHEN interval = 'year' AND lower(name) = 'yearly' THEN 'legacy_yearly'
       END AS proposed_plan_key,
       count(*) AS duplicate_count
FROM plans
WHERE interval = 'lifetime'
   OR (interval = 'month' AND lower(name) = 'monthly')
   OR (interval = 'year' AND lower(name) = 'yearly')
GROUP BY proposed_plan_key
HAVING count(*) > 1;

SELECT p.name, p.interval, s.status, count(*) AS subscriptions
FROM subscriptions s
JOIN plans p ON p.id = s.plan_id
GROUP BY p.name, p.interval, s.status
ORDER BY p.name, s.status;

SELECT plan_type, count(*) AS users
FROM users
GROUP BY plan_type
ORDER BY plan_type;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT CASE
               WHEN interval = 'lifetime' THEN 'lifetime'
               WHEN interval = 'month' AND lower(name) = 'monthly' THEN 'legacy_monthly'
               WHEN interval = 'year' AND lower(name) = 'yearly' THEN 'legacy_yearly'
             END AS proposed_plan_key
      FROM plans
      WHERE interval = 'lifetime'
         OR (interval = 'month' AND lower(name) = 'monthly')
         OR (interval = 'year' AND lower(name) = 'yearly')
      GROUP BY proposed_plan_key
      HAVING count(*) > 1
    ) duplicate_plans
  ) THEN
    RAISE EXCEPTION 'Preflight failed: duplicate Lifetime, Monthly, or Yearly plan rows exist';
  END IF;

  IF EXISTS (
    SELECT 1 FROM subscriptions s JOIN plans p ON p.id = s.plan_id
    WHERE NOT (
      p.interval = 'lifetime'
      OR (p.interval = 'month' AND lower(p.name) = 'growth')
    )
  ) THEN
    RAISE EXCEPTION 'Preflight failed: legacy subscription rows exist';
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE plan_type IN ('monthly', 'yearly')) THEN
    RAISE EXCEPTION 'Preflight failed: legacy user plan types exist';
  END IF;
END $$;
