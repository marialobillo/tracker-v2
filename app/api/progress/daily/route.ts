// GET /api/progress/daily?days=30 - fetch daily progress

import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { dailyProgress } from "@/app/src/db/schema";
import { gte, lte, asc, and } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get("days") || "30");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (days - 1));

  const startStr = startDate.toISOString().split("T")[0];
  const endStr = endDate.toISOString().split("T")[0];

  const rows = await db
    .select()
    .from(dailyProgress)
    .where(and(gte(dailyProgress.date, startStr), lte(dailyProgress.date, endStr)))
    .orderBy(asc(dailyProgress.date));

  // Build a map of existing data
  const rowMap = new Map(rows.map((r) => [r.date, r]));

  // Fill in missing dates with zeros
  const result = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    const existing = rowMap.get(dateStr);
    result.push({
      date: dateStr,
      count: existing?.applicationsCount || 0,
      goalMet: existing?.goalMet === 1,
    });
    current.setDate(current.getDate() + 1);
  }

  return NextResponse.json(result);
}