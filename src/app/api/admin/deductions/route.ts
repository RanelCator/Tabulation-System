import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { deductions, participants } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventId?: string;
    participantId?: string;
    points?: number | string;
    reason?: string;
  };

  const eventId = body.eventId?.trim();
  const participantId = body.participantId?.trim();
  const points = Number(body.points ?? 0);
  const reason = body.reason?.trim() ?? "";

  if (!eventId || !participantId) {
    return NextResponse.json(
      { error: "eventId and participantId are required" },
      { status: 400 },
    );
  }

  if (Number.isNaN(points) || points < 0) {
    return NextResponse.json(
      { error: "Deduction points must be a valid non-negative number" },
      { status: 400 },
    );
  }

  const [participant] = await db
    .select()
    .from(participants)
    .where(eq(participants.id, participantId));

  if (!participant) {
    return NextResponse.json({ error: "Participant not found" }, { status: 404 });
  }

  await db
    .insert(deductions)
    .values({
      eventId,
      participantId,
      points: points.toFixed(2),
      reason,
    })
    .onConflictDoUpdate({
      target: [deductions.eventId, deductions.participantId],
      set: {
        points: points.toFixed(2),
        reason,
      },
    });

  return NextResponse.json({ success: true });
}