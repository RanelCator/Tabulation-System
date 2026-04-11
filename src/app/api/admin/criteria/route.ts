import { NextResponse } from "next/server";
import { db } from "@/db";
import { criteria } from "@/db/schema";
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
    .from(criteria)
    .where(eq(criteria.eventId, eventId))
    .orderBy(asc(criteria.sortOrder));

  return NextResponse.json({ criteria: rows });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    eventId?: string;
    name?: string;
    maxScore?: number | string;
    sortOrder?: number;
  };

  const eventId = body.eventId?.trim();
  const name = body.name?.trim();
  const maxScore = Number(body.maxScore);
  const sortOrder = Number(body.sortOrder ?? 0);

  if (!eventId || !name || Number.isNaN(maxScore)) {
    return NextResponse.json(
      { error: "eventId, name, and maxScore are required" },
      { status: 400 },
    );
  }

  const [created] = await db
    .insert(criteria)
    .values({
      eventId,
      name,
      maxScore: maxScore.toFixed(2),
      sortOrder,
    })
    .returning();

  return NextResponse.json({ success: true, criterion: created });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    maxScore?: number | string;
    sortOrder?: number;
  };

  const id = body.id?.trim();
  const name = body.name?.trim();
  const maxScore = Number(body.maxScore);
  const sortOrder = Number(body.sortOrder ?? 0);

  if (!id || !name || Number.isNaN(maxScore)) {
    return NextResponse.json(
      { error: "id, name, and maxScore are required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(criteria)
    .set({
      name,
      maxScore: maxScore.toFixed(2),
      sortOrder,
    })
    .where(eq(criteria.id, id))
    .returning();

  return NextResponse.json({ success: true, criterion: updated });
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

  await db.delete(criteria).where(eq(criteria.id, id));

  return NextResponse.json({ success: true });
}