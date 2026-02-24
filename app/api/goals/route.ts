// GET /api/goals - fetch current goals
// PUT /api/goals - update goals

import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { goals } from "@/app/src/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(goals).where(eq(goals.id, 1));

  if (rows.length === 0) {
    // Insert default goals if none exist
    await db.insert(goals).values({ id: 1, dailyGoal: 5, weeklyGoal: 25 });
    return NextResponse.json({ daily_goal: 5, weekly_goal: 25 });
  }

  return NextResponse.json({
    daily_goal: rows[0].dailyGoal,
    weekly_goal: rows[0].weeklyGoal,
  });
}

export async function PUT(request: Request) {
  const body = await request.json();

  await db
    .insert(goals)
    .values({
      id: 1,
      dailyGoal: body.daily_goal,
      weeklyGoal: body.weekly_goal,
    })
    .onConflictDoUpdate({
      target: goals.id,
      set: {
        dailyGoal: body.daily_goal,
        weeklyGoal: body.weekly_goal,
      },
    });

  return NextResponse.json({
    daily_goal: body.daily_goal,
    weekly_goal: body.weekly_goal,
  });
}