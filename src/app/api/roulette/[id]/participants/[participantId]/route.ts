import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  rouletteParticipants
} from "@/db/schema/roulette";
import { and, eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{
    id: string;
    participantId: string;
  }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id: sessionId, participantId } = await context.params;

    const deleted = await db
      .delete(rouletteParticipants)
      .where(
        and(
          eq(rouletteParticipants.id, participantId),
          eq(rouletteParticipants.sessionId, sessionId),
        ),
      )
      .returning({
        id: rouletteParticipants.id,
      });

    if (deleted.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Participant not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Participant deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE participant error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to delete participant.",
      },
      { status: 500 },
    );
  }
}