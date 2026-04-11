import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getSession } from "@/lib/session";
import { getEventRankings } from "@/lib/rankings";

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

  const result = await getEventRankings(eventId);

  if (!result) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const rankingRows = result.rankings.map((item) => ({
    Rank: item.rank,
    Number: item.participantNumber,
    Participant: item.participantName,
    "Raw Score": item.rawScore,
    Deduction: item.deduction,
    "Deduction Reason": item.deductionReason,
    "Final Score": item.finalScore,
  }));

  const worksheet = XLSX.utils.json_to_sheet(rankingRows);

  const judgesStartRow = rankingRows.length + 4;
  XLSX.utils.sheet_add_aoa(
    worksheet,
    [
      [],
      ["Judges"],
      ...result.judges.map((judge) => [judge.displayName]),
    ],
    { origin: `A${judgesStartRow}` },
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rankings");

  const buffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
  });

  const safeEventName = result.event.name.replace(/[^\w\s-]/g, "").replace(/\s+/g, "_");

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${safeEventName}_rankings.xlsx"`,
    },
  });
}