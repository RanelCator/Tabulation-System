// src/app/api/admin/karaoke/queue/[id]/force-next/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { karaokeQueueItems, karaokeSessions } from "@/db/schema/karaoke";
import { and, asc, eq } from "drizzle-orm";

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
      .where(eq(karaokeSessions.isActive, true))
      .limit(1);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "No active karaoke session." },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      const queuedItems = await tx
        .select()
        .from(karaokeQueueItems)
        .where(
          and(
            eq(karaokeQueueItems.sessionId, session.id),
            eq(karaokeQueueItems.status, "queued"),
          ),
        )
        .orderBy(asc(karaokeQueueItems.queueNumber));

      const targetIndex = queuedItems.findIndex((item) => item.id === id);

      if (targetIndex === -1) {
        throw new Error("Song is not in the active queue.");
      }

      const reordered = [
        queuedItems[targetIndex],
        ...queuedItems.slice(0, targetIndex),
        ...queuedItems.slice(targetIndex + 1),
      ];

      for (let index = 0; index < reordered.length; index += 1) {
        await tx
          .update(karaokeQueueItems)
          .set({
            queueNumber: index + 1,
          })
          .where(eq(karaokeQueueItems.id, reordered[index].id));
      }
    });

    return NextResponse.json({
      success: true,
      message: "Song moved to next queue.",
    });
  } catch (error) {
    console.error("Force next karaoke song error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Failed to force song next.",
      },
      { status: 500 },
    );
  }
}