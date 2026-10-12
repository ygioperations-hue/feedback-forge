import test from "node:test";
import assert from "node:assert/strict";
import { seedDatabase } from "../server/seed";

test("database seeding refuses to run in production before accessing data", async () => {
  await assert.rejects(seedDatabase("production"), /disabled in production/);
});
