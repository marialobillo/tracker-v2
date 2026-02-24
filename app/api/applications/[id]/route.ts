// PUT /api/applications/:id - update an application
// DELETE /api/applications/:id - delete an application

import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { applications } from "@/app/src/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const result = await db
    .update(applications)
    .set({
      dateApplied: body.dateApplied,
      week: body.week,
      position: body.position,
      company: body.company,
      location: body.location,
      seniority: body.seniority,
      specialization: body.specialization,
      jobPostingUrl: body.jobPostingUrl,
      status: body.status,
      salary: body.salary,
      notes: body.notes,
      rejectionReason: body.rejectionReason,
      interviews: body.interviews,
    })
    .where(eq(applications.id, parseInt(id)))
    .returning();

  if (result.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await db
    .delete(applications)
    .where(eq(applications.id, parseInt(id)));

  return NextResponse.json({ ok: true });
}