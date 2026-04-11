import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, participants } from "@/db/schema";
import { getSession } from "@/lib/session";
import { asc, eq } from "drizzle-orm";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ error: "eventId is required" }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(participants)
    .where(eq(participants.eventId, eventId))
    .orderBy(asc(participants.number));

  return NextResponse.json({ participants: rows });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventId?: string;
    number?: number;
    name?: string;
  };

  const eventId = body.eventId?.trim();
  const number = Number(body.number);
  const name = body.name?.trim();

  if (!eventId || !name || Number.isNaN(number)) {
    return NextResponse.json(
      { error: "eventId, number, and name are required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(participants)
    .values({
      eventId,
      number,
      name,
    })
    .returning();

  return NextResponse.json({ success: true, participant: created });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    number?: number;
    name?: string;
  };

  const id = body.id?.trim();
  const number = Number(body.number);
  const name = body.name?.trim();

  if (!id || !name || Number.isNaN(number)) {
    return NextResponse.json(
      { error: "id, number, and name are required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(participants)
    .set({
      number,
      name,
    })
    .where(eq(participants.id, id))
    .returning();

  return NextResponse.json({ success: true, participant: updated });
}

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  await db.delete(participants).where(eq(participants.id, id));

  return NextResponse.json({ success: true });
}