// GET /api/progress/stats - fetch streak and goal stats

import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { dailyProgress } from "@/app/src/db/schema";
import { gte, lte, desc, and } from "drizzle-orm";

export async function GET() {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  // Last 30 days
  const recent = await db
    .select()
    .from(dailyProgress)
    .where(and(gte(dailyProgress.date, startStr), lte(dailyProgress.date, endStr)))
    .orderBy(desc(dailyProgress.date));

  const daysMet = recent.filter((r) => r.goalMet === 1).length;

  // Current streak
  let currentStreak = 0;
  for (const r of recent) {
    if (r.goalMet === 1) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Longest streak (all time)
  const allRows = await db
    .select()
    .from(dailyProgress)
    .orderBy(desc(dailyProgress.date));

  let longestStreak = 0;
  let tempStreak = 0;
  for (const r of allRows) {
    if (r.goalMet === 1) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  }

  return NextResponse.json({
    daysMet,
    totalDays: recent.length,
    currentStreak,
    longestStreak,
  });
}