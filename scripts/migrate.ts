// Migration script: imports SQLite data (JSON export) into Neon PostgreSQL
// Run with: npx tsx scripts/migrate.ts

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { applications, goals } from "../app/src/db/schema";
import * as fs from "fs";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql);

  // Read the exported JSON
  const raw = fs.readFileSync("./apps_export.json", "utf-8");
  const rows = JSON.parse(raw);

  console.log(`Found ${rows.length} applications to migrate`);

  // Insert in batches of 20 (Neon has query size limits)
  const BATCH_SIZE = 20;
  let imported = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);

    const values = batch.map((row: any) => ({
      id: row.id,
      dateApplied: row.date_applied || null,
      week: row.week || null,
      position: row.position || "",
      company: row.company || "",
      location: row.location || null,
      seniority: row.seniority || "Senior",
      specialization: row.specialization || "Backend",
      jobPostingUrl: row.job_posting_url || null,
      status: row.status || "Applied",
      salary: row.salary || null,
      notes: row.notes || null,
      rejectionReason: row.rejection_reason || null,
      // interviews comes as a JSON string from SQLite, parse it
      interviews: typeof row.interviews === "string"
        ? JSON.parse(row.interviews)
        : row.interviews || {},
    }));

    await db.insert(applications).values(values);
    imported += batch.length;
    console.log(`  Imported ${imported}/${rows.length}`);
  }

  // Insert default goals
  await db
    .insert(goals)
    .values({ id: 1, dailyGoal: 5, weeklyGoal: 25 })
    .onConflictDoNothing();

  console.log(`\n✅ Migration complete: ${imported} applications imported`);
}

migrate().catch(console.error);