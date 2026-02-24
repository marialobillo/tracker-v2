// Drizzle Kit config - used for migrations and schema push
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});