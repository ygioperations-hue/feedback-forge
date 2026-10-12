import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import pg from "pg";
import { discoverMigrations, runMigrations, stripPsqlCommands } from "../scripts/migrate.mjs";

test("migration discovery is ordered and psql commands are excluded", () => {
  assert.deepEqual(
    discoverMigrations().map((migration) => migration.name),
    ["0001_monthly_usage.sql", "0002_growth_plan.sql", "0003_production_hardening.sql"],
  );
  assert.equal(stripPsqlCommands("\\set ON_ERROR_STOP on\nSELECT 1;"), "SELECT 1;");
});

test("Railway deploys run checked migrations before application startup", () => {
  const railway = JSON.parse(readFileSync(new URL("../railway.json", import.meta.url), "utf8"));
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(railway.build.buildCommand, "npm run build");
  assert.equal(railway.deploy.preDeployCommand, "npm run db:migrate");
  assert.equal(railway.deploy.startCommand, "npm start");
  assert.equal(railway.deploy.healthcheckPath, "/api/health");
  assert.equal(packageJson.scripts["db:migrate"], "node scripts/migrate.mjs");
});

test("migration runner is idempotent and verifies checksums (requires TEST_DATABASE_URL)", { skip: !process.env.TEST_DATABASE_URL }, async () => {
  const connectionString = process.env.TEST_DATABASE_URL!;
  const first = await runMigrations({ connectionString, log: () => undefined });
  const second = await runMigrations({ connectionString, log: () => undefined });
  const expected = discoverMigrations();

  assert.equal(first.total, expected.length);
  assert.deepEqual(second, { applied: [], total: expected.length });

  const client = new pg.Client({ connectionString });
  await client.connect();
  try {
    const result = await client.query("SELECT name, checksum FROM app_schema_migrations ORDER BY name");
    assert.deepEqual(result.rows, expected.map(({ name, checksum }) => ({ name, checksum })));

    await client.query("UPDATE app_schema_migrations SET checksum = 'invalid' WHERE name = $1", [expected[0].name]);
    await assert.rejects(
      runMigrations({ connectionString, log: () => undefined }),
      /Migration checksum mismatch/,
    );
    await client.query("UPDATE app_schema_migrations SET checksum = $1 WHERE name = $2", [expected[0].checksum, expected[0].name]);
  } finally {
    await client.end();
  }
});
