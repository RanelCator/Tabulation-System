import { NextResponse } from "next/server";
import { db } from "@/db";
import { participants } from "@/db/schema";
import { getSession } from "@/lib/session";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(participants)
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

  if (!eventId || !Number.isInteger(number) || !name) {
    return NextResponse.json(
      { error: "eventId, number, and name are required" },
      { status: 400 },
    );
  }

  const [participant] = await db
    .insert(participants)
    .values({
      eventId,
      number,
      name,
    })
    .returning();

  return NextResponse.json({ success: true, participant });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    eventId?: string;
    number?: number;
    name?: string;
  };

  const id = body.id?.trim();
  const eventId = body.eventId?.trim();
  const number = Number(body.number);
  const name = body.name?.trim();

  if (!id || !eventId || !Number.isInteger(number) || !name) {
    return NextResponse.json(
      { error: "id, eventId, number, and name are required" },
      { status: 400 },
    );
  }

  await db
    .update(participants)
    .set({
      eventId,
      number,
      name,
    })
    .where(eq(participants.id, id));

  return NextResponse.json({ success: true });
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