// src/app/api/admin/karaoke/end-current/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  karaokePlaybackState,
  karaokeQueueItems,
  karaokeSessions,
} from "@/db/schema/karaoke";
import { eq } from "drizzle-orm";

export async function POST() {
  try {
    const [session] = await db
      .select()
      .from(karaokeSessions)
      .where(eq(karaokeSessions.isActive, true))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "No active karaoke session." },
        { status: 404 },
      );
    }

    const [playback] = await db
      .select()
      .from(karaokePlaybackState)
      .where(eq(karaokePlaybackState.sessionId, session.id))
      .limit(1);

    if (!playback?.currentQueueItemId) {
      return NextResponse.json(
        { success: false, message: "No song is currently playing." },
        { status: 400 },
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(karaokeQueueItems)
        .set({
          status: "played",
          playedAt: new Date(),
        })
        .where(eq(karaokeQueueItems.id, playback.currentQueueItemId!));

      await tx
        .update(karaokePlaybackState)
        .set({
          currentQueueItemId: null,
          isPlaying: false,
          updatedAt: new Date(),
        })
        .where(eq(karaokePlaybackState.sessionId, session.id));
    });

    return NextResponse.json({
      success: true,
      message: "Current song ended.",
    });
  } catch (error) {
    console.error("End current karaoke song error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to end current song." },
      { status: 500 },
    );
  }
}