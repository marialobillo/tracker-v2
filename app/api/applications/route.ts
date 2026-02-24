// GET /api/applications - fetch all applications
// POST /api/applications - create a new application

import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { applications } from "@/app/src/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db
    .select()
    .from(applications)
    .orderBy(desc(applications.dateApplied));

  return NextResponse.json(rows);
}

export async function POST(request: Request) {
  const body = await request.json();

  const result = await db
    .insert(applications)
    .values({
      id: body.id || Date.now(),
      dateApplied: body.dateApplied || null,
      week: body.week || null,
      position: body.position,
      company: body.company,
      location: body.location || null,
      seniority: body.seniority || "Senior",
      specialization: body.specialization || "Backend",
      jobPostingUrl: body.jobPostingUrl || null,
      status: body.status || "Applied",
      salary: body.salary || null,
      notes: body.notes || null,
      rejectionReason: body.rejectionReason || null,
      interviews: body.interviews || {},
    })
    .returning();

  return NextResponse.json(result[0], { status: 201 });
}