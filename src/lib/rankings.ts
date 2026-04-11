import { db } from "@/db";
import {
  deductions,
  events,
  judgeAssignments,
  participants,
  scores,
  users,
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export type RankingResultItem = {
  participantId: string;
  participantNumber: number;
  participantName: string;
  rawScore: number;
  deduction: number;
  deductionReason: string;
  finalScore: number;
  rank: number;
};

export type RankingResult = {
  event: {
    id: string;
    name: string;
    status: "draft" | "open" | "closed";
  };
  rankings: RankingResultItem[];
  judges: {
    id: string;
    displayName: string;
  }[];
};

export async function getEventRankings(eventId: string): Promise<RankingResult | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));

  if (!event) {
    return null;
  }

  const rankingRows = await db
    .select({
      participantId: participants.id,
      participantNumber: participants.number,
      participantName: participants.name,
      rawScore: sql<string>`COALESCE(SUM(${scores.score}), 0)`,
      deduction: sql<string>`COALESCE(MAX(${deductions.points}), 0)`,
      deductionReason: sql<string>`COALESCE(MAX(${deductions.reason}), '')`,
      finalScore: sql<string>`COALESCE(SUM(${scores.score}), 0) - COALESCE(MAX(${deductions.points}), 0)`,
    })
    .from(participants)
    .leftJoin(scores, eq(scores.participantId, participants.id))
    .leftJoin(deductions, eq(deductions.participantId, participants.id))
    .where(eq(participants.eventId, eventId))
    .groupBy(participants.id, participants.number, participants.name);

  const rankings = [...rankingRows]
    .map((row) => ({
      participantId: row.participantId,
      participantNumber: row.participantNumber,
      participantName: row.participantName,
      rawScore: Number(row.rawScore ?? 0),
      deduction: Number(row.deduction ?? 0),
      deductionReason: row.deductionReason ?? "",
      finalScore: Number(row.finalScore ?? 0),
      rank: 0,
    }))
    .sort((a, b) => {
      if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
      if (b.rawScore !== a.rawScore) return b.rawScore - a.rawScore;
      return a.participantNumber - b.participantNumber;
    })
    .map((row, index) => ({
      ...row,
      rank: index + 1,
    }));

  const judges = await db
    .select({
      id: users.id,
      displayName: users.displayName,
    })
    .from(judgeAssignments)
    .innerJoin(users, eq(users.id, judgeAssignments.judgeUserId))
    .where(eq(judgeAssignments.eventId, eventId));

  return {
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
    },
    rankings,
    judges,
  };
}