import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, "..");
const MIGRATION_LOCK_KEY = 2147483647;

function loadLocalEnvironment(rootDir) {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const parsed = new Map();

  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
    const separator = normalized.indexOf("=");
    if (separator <= 0) continue;

    const key = normalized.slice(0, separator).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = normalized.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed.set(key, value);
  }

  for (const [key, value] of parsed) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

export function stripPsqlCommands(sql) {
  return sql
    .split(/\r?\n/)
    .filter((line) => !line.trimStart().startsWith("\\"))
    .join("\n");
}

export function discoverMigrations(rootDir = REPOSITORY_ROOT) {
  const migrationsDir = path.join(rootDir, "migrations");
  return readdirSync(migrationsDir)
    .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
    .sort()
    .map((name) => {
      const sql = readFileSync(path.join(migrationsDir, name), "utf8");
      return {
        name,
        sql,
        checksum: createHash("sha256").update(sql).digest("hex"),
      };
    });
}

export async function runMigrations({
  connectionString,
  rootDir = REPOSITORY_ROOT,
  log = console.log,
} = {}) {
  const databaseUrl = connectionString ?? process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required to run migrations");

  const migrations = discoverMigrations(rootDir);
  if (migrations.length === 0) throw new Error("No SQL migrations were found");

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  let locked = false;

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    locked = true;
    await client.query("BEGIN");
    await client.query("SET LOCAL lock_timeout = '30s'");
    await client.query("SET LOCAL statement_timeout = '5min'");

    const preflight = stripPsqlCommands(
      readFileSync(path.join(rootDir, "scripts", "preflight-production-db.sql"), "utf8"),
    );
    await client.query(preflight);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        name text PRIMARY KEY,
        checksum text NOT NULL,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const applied = await client.query("SELECT name, checksum FROM app_schema_migrations");
    const appliedByName = new Map(applied.rows.map((row) => [row.name, row.checksum]));
    const newlyApplied = [];

    for (const migration of migrations) {
      const previousChecksum = appliedByName.get(migration.name);
      if (previousChecksum) {
        if (previousChecksum !== migration.checksum) {
          throw new Error(`Migration checksum mismatch for ${migration.name}`);
        }
        log(`Migration already applied: ${migration.name}`);
        continue;
      }

      log(`Applying migration: ${migration.name}`);
      await client.query(migration.sql);
      await client.query(
        "INSERT INTO app_schema_migrations (name, checksum) VALUES ($1, $2)",
        [migration.name, migration.checksum],
      );
      newlyApplied.push(migration.name);
    }

    const verification = stripPsqlCommands(
      readFileSync(path.join(rootDir, "scripts", "verify-production-schema.sql"), "utf8"),
    );
    await client.query(verification);
    await client.query("COMMIT");
    log(`Database migration verification passed (${newlyApplied.length} applied, ${migrations.length - newlyApplied.length} unchanged)`);
    return { applied: newlyApplied, total: migrations.length };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    if (locked) await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY]).catch(() => undefined);
    await client.end();
  }
}

async function main() {
  loadLocalEnvironment(REPOSITORY_ROOT);
  await runMigrations();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Database migration failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
