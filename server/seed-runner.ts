import "./env";
import { seedDatabase } from "./seed";

if (process.env.NODE_ENV === "production") {
  throw new Error("Database seeding is disabled in production");
}

seedDatabase().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
