// src/app/api/admin/karaoke/queue/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { karaokeQueueItems, karaokeSessions } from "@/db/schema/karaoke";
import { and, desc, eq } from "drizzle-orm";

function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?&]+)/,
    /youtube\.com\/embed\/([^?&]+)/,
    /youtube\.com\/shorts\/([^?&]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      singerName?: string;
      youtubeUrl?: string;
    };

    const singerName = body.singerName?.trim();
    const youtubeUrl = body.youtubeUrl?.trim();

    if (!singerName || !youtubeUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "Participant name and YouTube link are required.",
        },
        { status: 400 },
      );
    }

    const youtubeVideoId = extractYouTubeVideoId(youtubeUrl);

    if (!youtubeVideoId) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid YouTube link.",
        },
        { status: 400 },
      );
    }

    const [session] = await db
      .select()
      .from(karaokeSessions)
      .where(eq(karaokeSessions.isActive, true))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        {
          success: false,
          message: "No active karaoke session.",
        },
        { status: 404 },
      );
    }

    const [latestQueueItem] = await db
      .select()
      .from(karaokeQueueItems)
      .where(
        and(
          eq(karaokeQueueItems.sessionId, session.id),
          eq(karaokeQueueItems.status, "queued"),
        ),
      )
      .orderBy(desc(karaokeQueueItems.queueNumber))
      .limit(1);

    const queueNumber = (latestQueueItem?.queueNumber ?? 0) + 1;

    await db.insert(karaokeQueueItems).values({
      sessionId: session.id,
      singerName,
      youtubeUrl,
      youtubeVideoId,
      title: null,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`,
      queueNumber,
      status: "queued",
    });

    return NextResponse.json({
      success: true,
      message: "Song added to queue.",
    });
  } catch (error) {
    console.error("Add karaoke song error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to add song.",
      },
      { status: 500 },
    );
  }
}