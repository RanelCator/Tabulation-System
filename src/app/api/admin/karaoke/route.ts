// src/app/api/karaoke/admin/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  karaokePlaybackState,
  karaokeQueueItems,
  karaokeSessions,
} from "@/db/schema/karaoke";
import { asc, eq } from "drizzle-orm";

export async function GET() {
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
        queue: [],
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

  const queue = await db
    .select()
    .from(karaokeQueueItems)
    .where(eq(karaokeQueueItems.status, "queued"))
    .orderBy(asc(karaokeQueueItems.queueNumber));

  return NextResponse.json({
    success: true,
    data: {
      session,
      currentItem,
      queue,
    },
  });
}