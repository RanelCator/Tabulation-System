import { NextResponse } from "next/server";
import { db } from "@/db";
import { events, judgeAssignments, users } from "@/db/schema";
import { getSession } from "@/lib/session";
import { and, asc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export async function GET() {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      isActive: users.isActive,
      eventId: judgeAssignments.eventId,
    })
    .from(users)
    .leftJoin(judgeAssignments, eq(judgeAssignments.judgeUserId, users.id))
    .where(eq(users.role, "judge"))
    .orderBy(asc(users.displayName));

  return NextResponse.json({ judges: rows });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    displayName?: string;
    passcode?: string;
    eventId?: string;
  };

  const displayName = body.displayName?.trim();
  const passcode = body.passcode?.trim();
  const eventId = body.eventId?.trim();

  if (!displayName || !passcode || !eventId) {
    return NextResponse.json(
      { error: "displayName, passcode, and eventId are required" },
      { status: 400 },
    );
  }

  const existingJudges = await db.select().from(users).where(eq(users.role, "judge"));

  for (const judge of existingJudges) {
    const matched = await bcrypt.compare(passcode, judge.passcodeHash);
    if (matched) {
      return NextResponse.json(
        { error: "Passcode is already used by another judge" },
        { status: 400 },
      );
    }
  }

  const passcodeHash = await bcrypt.hash(passcode, 10);

  const [judge] = await db
    .insert(users)
    .values({
      role: "judge",
      displayName,
      passcodeHash,
      isActive: true,
    })
    .returning();

  await db.insert(judgeAssignments).values({
    judgeUserId: judge.id,
    eventId,
  });

  return NextResponse.json({ success: true, judge });
}

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    id?: string;
    displayName?: string;
    passcode?: string;
    eventId?: string;
    isActive?: boolean;
  };

  const id = body.id?.trim();
  const displayName = body.displayName?.trim();
  const passcode = body.passcode?.trim();
  const eventId = body.eventId?.trim();
  const isActive = Boolean(body.isActive);

  if (!id || !displayName || !eventId) {
    return NextResponse.json(
      { error: "id, displayName, and eventId are required" },
      { status: 400 },
    );
  }

  const updateData: {
    displayName: string;
    isActive: boolean;
    passcodeHash?: string;
  } = {
    displayName,
    isActive,
  };

  if (passcode) {
    const existingJudges = await db
      .select()
      .from(users)
      .where(eq(users.role, "judge"));

    for (const judge of existingJudges) {
      if (judge.id === id) continue;

      const matched = await bcrypt.compare(passcode, judge.passcodeHash);
      if (matched) {
        return NextResponse.json(
          { error: "Passcode is already used by another judge" },
          { status: 400 },
        );
      }
    }

    updateData.passcodeHash = await bcrypt.hash(passcode, 10);
  }

  await db.update(users).set(updateData).where(eq(users.id, id));

  const existingAssignment = await db
    .select()
    .from(judgeAssignments)
    .where(eq(judgeAssignments.judgeUserId, id))
    .limit(1);

  if (existingAssignment.length) {
    await db
      .update(judgeAssignments)
      .set({ eventId })
      .where(eq(judgeAssignments.judgeUserId, id));
  } else {
    await db.insert(judgeAssignments).values({
      judgeUserId: id,
      eventId,
    });
  }

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

  await db.delete(judgeAssignments).where(eq(judgeAssignments.judgeUserId, id));
  await db.delete(users).where(and(eq(users.id, id), eq(users.role, "judge")));

  return NextResponse.json({ success: true });
}