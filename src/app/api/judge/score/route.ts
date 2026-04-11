import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/db";
import { events, scores } from "@/db/schema";

type ScoreInput = {
  criterionId: string;
  score: string | number;
};

export async function POST(req: Request) {
  const session = await getSession();

  if (!session || session.role !== "judge") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const eventId = body?.eventId as string | undefined;
  const participantId = body?.participantId as string | undefined;
  const scoresData = body?.scoresData as ScoreInput[] | undefined;

  if (!eventId || !participantId || !Array.isArray(scoresData)) {
    return NextResponse.json(
      { error: "Invalid request payload." },
      { status: 400 },
    );
  }

  if (scoresData.length === 0) {
    return NextResponse.json(
      { error: "No scores provided." },
      { status: 400 },
    );
  }

  try {
    const eventRows = await db
      .select({
        id: events.id,
        status: events.status,
      })
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);

    const event = eventRows[0];

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    if (event.status !== "open") {
      return NextResponse.json(
        {
          error: `This event is ${event.status}. Score submission is not allowed.`,
        },
        { status: 400 },
      );
    }

    for (const item of scoresData) {
      const criterionId = item?.criterionId;
      const numericScore = Number(item?.score);

      if (!criterionId || !Number.isFinite(numericScore)) {
        return NextResponse.json(
          { error: "Invalid score entry detected." },
          { status: 400 },
        );
      }

      if (numericScore < 0) {
        return NextResponse.json(
          { error: "Scores cannot be below 0." },
          { status: 400 },
        );
      }

      const scoreValue = String(numericScore);

      await db
        .insert(scores)
        .values({
          eventId,
          participantId,
          judgeUserId: session.id,
          criterionId,
          score: scoreValue,
        })
        .onConflictDoUpdate({
          target: [
            scores.judgeUserId,
            scores.participantId,
            scores.criterionId,
          ],
          set: {
            score: scoreValue,
          },
        });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save judge scores:", error);

    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}