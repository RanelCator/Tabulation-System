import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import {
  judgeAssignments,
  events,
  participants,
  criteria,
} from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "judge") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get assigned event
  const assignment = await db
    .select()
    .from(judgeAssignments)
    .where(eq(judgeAssignments.judgeUserId, session.id))
    .limit(1);

  if (!assignment.length) {
    return NextResponse.json({ error: "No assigned event" }, { status: 404 });
  }

  const eventId = assignment[0].eventId;

  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, eventId));

  const eventParticipants = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, eventId));

  const eventCriteria = await db
    .select()
    .from(criteria)
    .where(eq(criteria.eventId, eventId));

  return NextResponse.json({
    event,
    participants: eventParticipants,
    criteria: eventCriteria,
  });
}