import { NextResponse } from "next/server";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rouletteDrawResults,
  rouletteParticipants,
  rouletteSessions,
} from "@/db/schema/roulette";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [session] = await db
      .select()
      .from(rouletteSessions)
      .where(eq(rouletteSessions.id, id))
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

    const participants = await db
      .select()
      .from(rouletteParticipants)
      .where(eq(rouletteParticipants.sessionId, id))
      .orderBy(asc(rouletteParticipants.orderNo));

    const drawResults = await db
      .select()
      .from(rouletteDrawResults)
      .where(eq(rouletteDrawResults.sessionId, id))
      .orderBy(desc(rouletteDrawResults.createdAt));

    return NextResponse.json({
      success: true,
      data: {
        session,
        participants,
        drawResults,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load roulette session details.",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const body = (await request.json()) as {
      title?: string;
      description?: string | null;
      status?: "draft" | "active" | "closed";
      removeWinnerAfterDraw?: boolean;
      predeterminedWinnerId?: string | null;
    };

    const [existingSession] = await db
      .select()
      .from(rouletteSessions)
      .where(eq(rouletteSessions.id, id))
      .limit(1);

    if (!existingSession) {
      return NextResponse.json(
        {
          success: false,
          message: "Roulette session not found.",
        },
        { status: 404 },
      );
    }

    const nextTitle =
      typeof body.title === "string" ? body.title.trim() : undefined;

    if (body.title !== undefined && !nextTitle) {
      return NextResponse.json(
        {
          success: false,
          message: "Title cannot be empty.",
        },
        { status: 400 },
      );
    }

    if (body.predeterminedWinnerId) {
      const [participant] = await db
        .select()
        .from(rouletteParticipants)
        .where(eq(rouletteParticipants.id, body.predeterminedWinnerId))
        .limit(1);

      if (!participant || participant.sessionId !== id) {
        return NextResponse.json(
          {
            success: false,
            message: "Predetermined winner is invalid for this session.",
          },
          { status: 400 },
        );
      }

      if (participant.isRemoved) {
        return NextResponse.json(
          {
            success: false,
            message: "Removed participant cannot be used as predetermined winner.",
          },
          { status: 400 },
        );
      }
    }

    const [updatedSession] = await db
      .update(rouletteSessions)
      .set({
        ...(nextTitle !== undefined ? { title: nextTitle } : {}),
        ...(body.description !== undefined
          ? { description: body.description?.trim() || null }
          : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.removeWinnerAfterDraw !== undefined
          ? { removeWinnerAfterDraw: body.removeWinnerAfterDraw }
          : {}),
        ...(body.predeterminedWinnerId !== undefined
          ? { predeterminedWinnerId: body.predeterminedWinnerId }
          : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(rouletteSessions.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      message: "Roulette session updated successfully.",
      data: updatedSession,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to update roulette session.",
      },
      { status: 500 },
    );
  }
}