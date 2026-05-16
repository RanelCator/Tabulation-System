// src/app/api/karaoke/live/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  karaokePlaybackState,
  karaokeQueueItems,
  karaokeSessions,
} from "@/db/schema/karaoke";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const [session] = await db
      .select()
      .from(karaokeSessions)
      .where(eq(karaokeSessions.isActive, true))
      .limit(1);

    if (!session) {
      return NextResponse.json({
        success: true,
        data: {
          session: null,
          currentItem: null,
          isPlaying: false,
        },
      });
    }

    const [playback] = await db
      .select()
      .from(karaokePlaybackState)
      .where(eq(karaokePlaybackState.sessionId, session.id))
      .limit(1);

    let currentItem = null;

    if (playback?.currentQueueItemId) {
      const [item] = await db
        .select()
        .from(karaokeQueueItems)
        .where(eq(karaokeQueueItems.id, playback.currentQueueItemId))
        .limit(1);

      currentItem = item ?? null;
    }

    return NextResponse.json({
      success: true,
      data: {
        session: {
          id: session.id,
          title: session.title,
        },
        currentItem,
        isPlaying: playback?.isPlaying ?? false,
      },
    });
  } catch (error) {
    console.error("Load karaoke live data error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load karaoke live data.",
      },
      { status: 500 },
    );
  }
}