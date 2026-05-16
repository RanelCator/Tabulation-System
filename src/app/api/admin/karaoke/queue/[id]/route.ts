// src/app/api/karaoke/admin/queue/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { karaokeQueueItems } from "@/db/schema/karaoke";
import { eq } from "drizzle-orm";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await db
    .update(karaokeQueueItems)
    .set({
      status: "removed",
    })
    .where(eq(karaokeQueueItems.id, id));

  return NextResponse.json({
    success: true,
    message: "Queue item removed.",
  });
}