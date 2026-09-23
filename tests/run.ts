if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;

await import("./monthly-quota.test");
await import("./migration-runner.test");
await import("./monthly-quota.db.test");
await import("./billing-plans.test");
await import("./stripe-subscriptions.test");
await import("./seed-safety.test");
