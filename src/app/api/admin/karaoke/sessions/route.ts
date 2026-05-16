// src/app/api/admin/karaoke/sessions/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { karaokeSessions } from "@/db/schema/karaoke";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const sessions = await db
      .select()
      .from(karaokeSessions)
      .orderBy(desc(karaokeSessions.createdAt));

    return NextResponse.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load karaoke sessions.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title?: string;
    };

    const title = body.title?.trim();

    if (!title) {
      return NextResponse.json(
        {
          success: false,
          message: "Session title is required.",
        },
        { status: 400 },
      );
    }

    const [session] = await db
      .insert(karaokeSessions)
      .values({
        title,
        isActive: false,
      })
      .returning();

    return NextResponse.json({
      success: true,
      message: "Karaoke session created.",
      data: session,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to create karaoke session.",
      },
      { status: 500 },
    );
  }
}