// src/app/api/admin/karaoke/sessions/[id]/activate/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { karaokeSessions } from "@/db/schema/karaoke";
import { eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    const [session] = await db
      .select()
      .from(karaokeSessions)
      .where(eq(karaokeSessions.id, id))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "Karaoke session not found.",
        },
        { status: 404 },
      );
    }

    await db
      .update(karaokeSessions)
      .set({
        isActive: false,
        updatedAt: new Date(),
      });

    await db
      .update(karaokeSessions)
      .set({
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(karaokeSessions.id, id));

    return NextResponse.json({
      success: true,
      message: "Karaoke session activated.",
    });
  } catch (error) {
    console.error("Activate karaoke session error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to activate karaoke session.",
      },
      { status: 500 },
    );
  }
}