// Recalculate daily progress for all existing applications
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { applications, dailyProgress, goals } from "../app/src/db/schema";
import { eq, sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function recalc() {
  const sqlClient = neon(process.env.DATABASE_URL!);
  const db = drizzle(sqlClient);

  // Get daily goal
  const goalsRow = await db.select().from(goals).where(eq(goals.id, 1));
  const dailyGoal = goalsRow.length > 0 ? goalsRow[0].dailyGoal ?? 5 : 5;

  // Get all distinct dates
  const dates = await db
    .selectDistinct({ date: applications.dateApplied })
    .from(applications)
    .where(sql`${applications.dateApplied} IS NOT NULL AND ${applications.dateApplied} != ''`);

  console.log(`Recalculating progress for ${dates.length} dates...`);

  for (const row of dates) {
    const dateStr = row.date!;
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(applications)
      .where(eq(applications.dateApplied, dateStr));

    const count = Number(result[0].count);
    const goalMet = count >= dailyGoal ? 1 : 0;

    await db
      .insert(dailyProgress)
      .values({ date: dateStr, applicationsCount: count, goalMet })
      .onConflictDoUpdate({
        target: dailyProgress.date,
        set: { applicationsCount: count, goalMet },
      });

    console.log(`  ${dateStr}: ${count} apps, goal ${goalMet ? "✅" : "❌"}`);
  }

  console.log("\n✅ Done!");
}

recalc().catch(console.error);