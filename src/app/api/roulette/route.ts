import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { rouletteSessions } from "@/db/schema/roulette";

export async function GET() {
  try {
    const sessions = await db
      .select()
      .from(rouletteSessions)
      .orderBy(desc(rouletteSessions.createdAt));

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to load roulette sessions.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      removeWinnerAfterDraw?: boolean;
    };

    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Title is required.",
        },
        { status: 400 },
      );
    }

    const [createdSession] = await db
      .insert(rouletteSessions)
      .values({
        title,
        description: body.description?.trim() || null,
        removeWinnerAfterDraw: body.removeWinnerAfterDraw ?? true,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Roulette session created successfully.",
      data: createdSession,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to create roulette session.",
      },
      { status: 500 },
    );
  }
}