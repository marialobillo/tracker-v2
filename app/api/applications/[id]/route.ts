// PUT /api/applications/:id - update an application
// DELETE /api/applications/:id - delete an application
import { NextResponse } from "next/server";
import { db } from "@/app/src/db";
import { applications } from "@/app/src/db/schema";
import { eq } from "drizzle-orm";
import { updateDailyProgress } from "@/app/src/db/helpers";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Get old date before updating (might need to recalculate old date's progress)
  const old = await db
    .select({ dateApplied: applications.dateApplied })
    .from(applications)
    .where(eq(applications.id, parseInt(id)));
  const oldDate = old.length > 0 ? old[0].dateApplied : null;

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

  // Update progress for old and new dates
  if (oldDate) await updateDailyProgress(oldDate);
  if (body.dateApplied && body.dateApplied !== oldDate) {
    await updateDailyProgress(body.dateApplied);
  }

  return NextResponse.json(result[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Get date before deleting
  const old = await db
    .select({ dateApplied: applications.dateApplied })
    .from(applications)
    .where(eq(applications.id, parseInt(id)));
  const oldDate = old.length > 0 ? old[0].dateApplied : null;

  await db
    .delete(applications)
    .where(eq(applications.id, parseInt(id)));

  // Recalculate progress for that date
  if (oldDate) await updateDailyProgress(oldDate);

  return NextResponse.json({ ok: true });
}