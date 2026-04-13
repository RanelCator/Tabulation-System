import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rouletteDrawResults,
  rouletteParticipants,
  rouletteSessions,
} from "@/db/schema/roulette";
import { pickRouletteWinner } from "@/lib/roulette/helpers";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type SpinResponse = {
  success: boolean;
  message: string;
  data?: {
    result: {
      id: string;
      sessionId: string;
      participantId: string;
      winnerNameSnapshot: string;
      drawMode: "random" | "predetermined";
      createdAt: Date | string;
    };
    winner: {
      participantId: string;
      participantName: string;
      drawMode: "random" | "predetermined";
    };
    wheelParticipants: Array<{
      id: string;
      name: string;
      orderNo: number;
    }>;
  };
};

export async function POST(
  _request: Request,
  context: RouteContext,
): Promise<NextResponse<SpinResponse>> {
  try {
    const { id: sessionId } = await context.params;

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

    if (session.status !== "active") {
      return NextResponse.json(
        {
          success: false,
          message: "Only active roulette sessions can spin.",
        },
        { status: 400 },
      );
    }

    const participants = await db
      .select()
      .from(rouletteParticipants)
      .where(eq(rouletteParticipants.sessionId, sessionId))
      .orderBy(asc(rouletteParticipants.orderNo));

    if (participants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No participants available for this session.",
        },
        { status: 400 },
      );
    }

    const wheelParticipants = participants
      .filter((participant) => !participant.isRemoved)
      .map((participant) => ({
        id: participant.id,
        name: participant.name,
        orderNo: participant.orderNo,
      }));

    if (wheelParticipants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No eligible participants left to spin.",
        },
        { status: 400 },
      );
    }

    const winner = pickRouletteWinner({
      participants: participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        isRemoved: participant.isRemoved,
      })),
      predeterminedWinnerId: session.predeterminedWinnerId,
    });

    if (!winner) {
      return NextResponse.json(
        {
          success: false,
          message: "No eligible participants left to spin.",
        },
        { status: 400 },
      );
    }

    const [createdResult] = await db
      .insert(rouletteDrawResults)
      .values({
        sessionId,
        participantId: winner.participantId,
        winnerNameSnapshot: winner.participantName,
        drawMode: winner.drawMode,
      })
      .returning();

    if (session.removeWinnerAfterDraw) {
      await db
        .update(rouletteParticipants)
        .set({
          isRemoved: true,
        })
        .where(eq(rouletteParticipants.id, winner.participantId));
    }

    await db
      .update(rouletteSessions)
      .set({
        predeterminedWinnerId: session.predeterminedWinnerId ? null : session.predeterminedWinnerId,
        updatedAt: sql`now()`,
      })
      .where(eq(rouletteSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      message: "Roulette spin completed successfully.",
      data: {
        result: createdResult,
        winner: {
          participantId: winner.participantId,
          participantName: winner.participantName,
          drawMode: winner.drawMode,
        },
        wheelParticipants,
      },
    });
  } catch (error) {
    console.error("Failed to spin roulette:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to spin roulette.",
      },
      { status: 500 },
    );
  }
}