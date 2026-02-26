// Helper to update daily progress when applications change
import { db } from "@/app/src/db";
import { applications, dailyProgress, goals } from "@/app/src/db/schema";
import { eq, sql } from "drizzle-orm";

export async function updateDailyProgress(dateStr: string) {
  if (!dateStr) return;

  // Count applications for this date
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(applications)
    .where(eq(applications.dateApplied, dateStr));

  const count = Number(result[0].count);

  // Get current daily goal
  const goalsRow = await db.select().from(goals).where(eq(goals.id, 1));
  const dailyGoal = goalsRow.length > 0 ? goalsRow[0].dailyGoal ?? 5 : 5;

  const goalMet = count >= dailyGoal ? 1 : 0;

  // Upsert daily progress
  await db
    .insert(dailyProgress)
    .values({ date: dateStr, applicationsCount: count, goalMet })
    .onConflictDoUpdate({
      target: dailyProgress.date,
      set: { applicationsCount: count, goalMet },
    });
}