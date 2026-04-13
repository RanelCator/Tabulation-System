import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rouletteParticipants,
  rouletteSessions,
} from "@/db/schema/roulette";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;

    const body = (await request.json().catch(() => ({}))) as {
      participantId?: string;
      restoreAll?: boolean;
    };

    const [session] = await db
      .select()
      .from(rouletteSessions)
      .where(eq(rouletteSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Roulette session not found.",
        },
        { status: 404 },
      );
    }

    if (body.restoreAll) {
      await db
        .update(rouletteParticipants)
        .set({
          isRemoved: false,
        })
        .where(eq(rouletteParticipants.sessionId, sessionId));

      await db
        .update(rouletteSessions)
        .set({
          updatedAt: sql`now()`,
        })
        .where(eq(rouletteSessions.id, sessionId));

      return NextResponse.json({
        success: true,
        message: "All participants restored successfully.",
      });
    }

    if (!body.participantId) {
      return NextResponse.json(
        {
          success: false,
          message: "participantId is required when restoreAll is false.",
        },
        { status: 400 },
      );
    }

    const [participant] = await db
      .select()
      .from(rouletteParticipants)
      .where(eq(rouletteParticipants.id, body.participantId))
      .limit(1);

    if (!participant || participant.sessionId !== sessionId) {
      return NextResponse.json(
        {
          success: false,
          message: "Participant not found in this roulette session.",
        },
        { status: 404 },
      );
    }

    await db
      .update(rouletteParticipants)
      .set({
        isRemoved: false,
      })
      .where(eq(rouletteParticipants.id, body.participantId));

    await db
      .update(rouletteSessions)
      .set({
        updatedAt: sql`now()`,
      })
      .where(eq(rouletteSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      message: "Participant restored successfully.",
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to restore participant(s).",
      },
      { status: 500 },
    );
  }
}