import { NextResponse } from "next/server";
import { db } from "@/db";
import { events } from "@/db/schema";
import { getSession } from "@/lib/session";
import { asc, eq } from "drizzle-orm";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.select().from(events).orderBy(asc(events.createdAt));

  return NextResponse.json({ events: rows });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    status?: "draft" | "open" | "closed";
  };

  const name = body.name?.trim();
  const status = body.status ?? "draft";

  if (!name) {
    return NextResponse.json({ error: "Event name is required" }, { status: 400 });
  }

  const [created] = await db
    .insert(events)
    .values({
      name,
      status,
    })
    .returning();

  return NextResponse.json({ success: true, event: created });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    name?: string;
    status?: "draft" | "open" | "closed";
  };

  const id = body.id?.trim();
  const name = body.name?.trim();
  const status = body.status;

  if (!id || !name || !status) {
    return NextResponse.json(
      { error: "id, name, and status are required" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(events)
    .set({
      name,
      status,
    })
    .where(eq(events.id, id))
    .returning();

  return NextResponse.json({ success: true, event: updated });
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

  await db.delete(events).where(eq(events.id, id));

  return NextResponse.json({ success: true });
}