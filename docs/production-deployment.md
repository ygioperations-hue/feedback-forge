# Railway deployment

Use Node 22. Never run database integration tests or `npm run db:push` against staging or production.
Use PostgreSQL 17 command-line clients for Railway PostgreSQL 17; an older `pg_dump` refuses to back up a newer server.

`railway.json` defines the release lifecycle for the application service:

1. Railway builds with `npm run build`.
2. Railway runs `npm run db:migrate` in a pre-deploy container with the service variables.
3. A migration failure stops the release and leaves the previous deployment active.
4. Railway starts the application with `npm start` and checks `/api/health`.

The application service must define `DATABASE_URL`, normally as a reference to `${{Postgres.DATABASE_URL}}`. A local `.env` file is never uploaded to Railway.

## 1. Local release checks

```bash
nvm use 22
npm ci
npm test
npm run check
npm run build
```

Run the database tests against a disposable PostgreSQL database containing the application schema:

```bash
export TEST_DATABASE_URL='postgresql://localhost/feedback_release_test'
TEST_DATABASE_URL="$TEST_DATABASE_URL" npm test
```

## 2. Stripe preflight

For the matching test or live Stripe environment:

1. Confirm the old Monthly and Yearly prices have no subscriptions in any status.
2. Confirm the Growth price is $19 USD recurring monthly.
3. Confirm the webhook endpoint receives `checkout.session.completed` and `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`.
4. Confirm the webhook signing secret belongs to the same Stripe environment as the API keys.

Do not migrate if a legacy Stripe subscription exists.

## 3. Production database preflight and backup

Read the database URL without putting it in shell history:

```bash
read -rsp 'Database URL: ' DEPLOY_DATABASE_URL
export DEPLOY_DATABASE_URL
echo
```

Run the read-only preflight and create a backup:

```bash
psql "$DEPLOY_DATABASE_URL" -X -v ON_ERROR_STOP=1 \
  -f scripts/preflight-production-db.sql

pg_dump "$DEPLOY_DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="/tmp/feedback-$(date -u +%Y%m%dT%H%M%SZ).dump"
```

## 4. Automatic migration

The Railway pre-deploy command runs:

```bash
npm run db:migrate
```

The runner acquires a PostgreSQL advisory lock, executes the preflight, applies each previously unapplied migration, records its SHA-256 checksum in `app_schema_migrations`, and executes the schema verification in the same transaction. A changed checksum or failed assertion rolls back the transaction and exits nonzero.

Migration `0003` aborts when a legacy user or subscription exists. Resolve the legacy record and redeploy instead of bypassing the guard. For the first production rollout of the usage ledger, pause or drain old application writers before triggering the deployment so responses cannot arrive after the historical backfill but before the new application takes over.

## 5. Deploy and smoke test

Merge the exact commit tested in staging into the branch connected to the Railway environment. The push triggers build, migration, health check, and deployment automatically.

```bash
curl -fsS "$DEPLOY_BASE_URL/" >/dev/null
curl -fsS "$DEPLOY_BASE_URL/api/plans" | jq
```

The plans response must contain only Lifetime and Growth. Then verify signup, Growth checkout, checkout reuse, cancellation, reactivation, one feedback submission, one AI insight, and Stripe webhook delivery.

## 6. Seeded administrator audit

Inspect the formerly seeded administrator before deciding whether its data is disposable:

```bash
psql "$DEPLOY_DATABASE_URL" -X -v ON_ERROR_STOP=1 -c "
SELECT
  u.id,
  u.email,
  u.role,
  (SELECT count(*) FROM projects p WHERE p.user_id = u.id) AS projects,
  (SELECT count(*) FROM projects p JOIN responses r ON r.project_id = p.id WHERE p.user_id = u.id) AS responses
FROM users u
WHERE u.email = 'ygi.operations@gmail.com';
"
```

After confirming the account and its cascade-owned data are disposable:

```bash
psql "$DEPLOY_DATABASE_URL" -X -v ON_ERROR_STOP=1 --single-transaction -c "
DELETE FROM users
WHERE email = 'ygi.operations@gmail.com'
  AND role = 'platform_admin'
RETURNING id, email;
"
```

## 7. Rollback

For an application failure, restore the previous application artifact and retain the additive schema and usage ledger. Restore the database backup only for verified data corruption.
