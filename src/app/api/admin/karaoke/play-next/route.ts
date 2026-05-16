// src/app/api/admin/karaoke/play-next/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  karaokePlaybackState,
  karaokeQueueItems,
  karaokeSessions,
} from "@/db/schema/karaoke";
import { and, asc, eq } from "drizzle-orm";

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

    const [nextItem] = await db
      .select()
      .from(karaokeQueueItems)
      .where(
        and(
          eq(karaokeQueueItems.sessionId, session.id),
          eq(karaokeQueueItems.status, "queued"),
        ),
      )
      .orderBy(asc(karaokeQueueItems.queueNumber))
      .limit(1);

    if (!nextItem) {
      return NextResponse.json(
        { success: false, message: "Queue is empty." },
        { status: 400 },
      );
    }

    const [existingPlayback] = await db
      .select()
      .from(karaokePlaybackState)
      .where(eq(karaokePlaybackState.sessionId, session.id))
      .limit(1);

    if (existingPlayback?.currentQueueItemId) {
      await db
        .update(karaokeQueueItems)
        .set({
          status: "played",
          playedAt: new Date(),
        })
        .where(eq(karaokeQueueItems.id, existingPlayback.currentQueueItemId));
    }

    await db
      .update(karaokeQueueItems)
      .set({
        status: "playing",
      })
      .where(eq(karaokeQueueItems.id, nextItem.id));

    if (existingPlayback) {
      await db
        .update(karaokePlaybackState)
        .set({
          currentQueueItemId: nextItem.id,
          isPlaying: true,
          updatedAt: new Date(),
        })
        .where(eq(karaokePlaybackState.sessionId, session.id));
    } else {
      await db.insert(karaokePlaybackState).values({
        sessionId: session.id,
        currentQueueItemId: nextItem.id,
        isPlaying: true,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Now playing next song.",
    });
  } catch (error) {
    console.error("Play next karaoke song error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to play next song.",
      },
      { status: 500 },
    );
  }
}