import { NextResponse } from "next/server";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  rouletteParticipants,
  rouletteSessions,
} from "@/db/schema/roulette";
import {
  normalizeParticipantName,
  parseBulkParticipants,
} from "@/lib/roulette/helpers";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id: sessionId } = await context.params;

    const body = (await request.json()) as {
      bulkInput?: string;
    };

    const bulkInput = body.bulkInput?.trim() ?? "";

    if (!bulkInput) {
      return NextResponse.json(
        {
          success: false,
          message: "Bulk participant input is required.",
        },
        { status: 400 },
      );
    }

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

    if (session.status === "closed") {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot modify a closed roulette session.",
        },
        { status: 400 },
      );
    }

    const parsedNames = parseBulkParticipants(bulkInput).map(
      normalizeParticipantName,
    );

    if (parsedNames.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "No valid participants found.",
        },
        { status: 400 },
      );
    }

    const existingParticipants = await db
      .select()
      .from(rouletteParticipants)
      .where(eq(rouletteParticipants.sessionId, sessionId))
      .orderBy(asc(rouletteParticipants.orderNo));

    const existingNames = new Set(
      existingParticipants.map((participant) => participant.name.toLowerCase()),
    );

    const nextParticipants = parsedNames.filter(
      (name) => !existingNames.has(name.toLowerCase()),
    );

    if (nextParticipants.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "All participants already exist in this session.",
        },
        { status: 400 },
      );
    }

    const startingOrder = existingParticipants.length;

    const insertedParticipants = await db
      .insert(rouletteParticipants)
      .values(
        nextParticipants.map((name, index) => ({
          sessionId,
          name,
          orderNo: startingOrder + index + 1,
        })),
      )
      .returning();

    await db
      .update(rouletteSessions)
      .set({
        updatedAt: sql`now()`,
      })
      .where(eq(rouletteSessions.id, sessionId));

    return NextResponse.json({
      success: true,
      message: "Participants added successfully.",
      data: insertedParticipants,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to add bulk participants.",
      },
      { status: 500 },
    );
  }
}