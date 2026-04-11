import { db } from "@/db";
import {
  criteria,
  deductions,
  events,
  judgeAssignments,
  participants,
  scores,
  users,
} from "@/db/schema";
import { eq } from "drizzle-orm";

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

export type JudgeCriteriaScore = {
  criterionId: string;
  criterionName: string;
  score: number;
};

export type JudgeRankingRow = {
  judgeId: string;
  judgeName: string;
  participantId: string;
  participantNumber: number;
  participantName: string;
  criteriaScores: JudgeCriteriaScore[];
  total: number;
  rank: number;
};

export type JudgeRankingGroup = {
  judgeId: string;
  judgeName: string;
  rows: JudgeRankingRow[];
};

export type CriteriaRankingRow = {
  criterionId: string;
  criterionName: string;
  participantId: string;
  participantNumber: number;
  participantName: string;
  score: number;
  rank: number;
};

export type CriteriaRankingGroup = {
  criterionId: string;
  criterionName: string;
  rows: CriteriaRankingRow[];
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
  judgeRankings: JudgeRankingGroup[];
  criteriaRankings: CriteriaRankingGroup[];
};

function assignRanks<T>(
  items: T[],
  getPrimaryScore: (item: T) => number,
  getSecondaryScore?: (item: T) => number,
  getTertiaryValue?: (item: T) => number,
): Array<T & { rank: number }> {
  const sorted = [...items].sort((a, b) => {
    const primaryDiff = getPrimaryScore(b) - getPrimaryScore(a);
    if (primaryDiff !== 0) return primaryDiff;

    if (getSecondaryScore) {
      const secondaryDiff = getSecondaryScore(b) - getSecondaryScore(a);
      if (secondaryDiff !== 0) return secondaryDiff;
    }

    if (getTertiaryValue) {
      return getTertiaryValue(a) - getTertiaryValue(b);
    }

    return 0;
  });

  return sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
  }));
}

export async function getEventRankings(eventId: string): Promise<RankingResult | null> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId));

  if (!event) {
    return null;
  }

  const participantRows = await db
    .select({
      id: participants.id,
      number: participants.number,
      name: participants.name,
    })
    .from(participants)
    .where(eq(participants.eventId, eventId));

  const judgeRows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
    })
    .from(judgeAssignments)
    .innerJoin(users, eq(users.id, judgeAssignments.judgeUserId))
    .where(eq(judgeAssignments.eventId, eventId));

  const criterionRows = await db
    .select({
      id: criteria.id,
      name: criteria.name,
      sortOrder: criteria.sortOrder,
    })
    .from(criteria)
    .where(eq(criteria.eventId, eventId));

  const scoreRows = await db
    .select({
      participantId: scores.participantId,
      judgeId: scores.judgeUserId,
      criterionId: scores.criterionId,
      score: scores.score,
    })
    .from(scores)
    .where(eq(scores.eventId, eventId));

  const deductionRows = await db
    .select({
      participantId: deductions.participantId,
      points: deductions.points,
      reason: deductions.reason,
    })
    .from(deductions)
    .where(eq(deductions.eventId, eventId));

  const criteriaSorted = [...criterionRows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.name.localeCompare(b.name);
  });

  const criterionMap = new Map(
    criteriaSorted.map((criterion) => [
      criterion.id,
      {
        id: criterion.id,
        name: criterion.name,
        sortOrder: criterion.sortOrder,
      },
    ]),
  );

  const scoresByParticipant = new Map<string, typeof scoreRows>();
  for (const row of scoreRows) {
    const existing = scoresByParticipant.get(row.participantId) ?? [];
    existing.push(row);
    scoresByParticipant.set(row.participantId, existing);
  }

  const scoreMap = new Map<string, number>();
  for (const row of scoreRows) {
    scoreMap.set(
      `${row.judgeId}:${row.participantId}:${row.criterionId}`,
      Number(row.score ?? 0),
    );
  }

  const deductionMap = new Map<
    string,
    {
      points: number;
      reason: string;
    }
  >();

  for (const row of deductionRows) {
    deductionMap.set(row.participantId, {
      points: Number(row.points ?? 0),
      reason: row.reason ?? "",
    });
  }

  const rankingsBase = participantRows.map((participant) => {
    const participantScores = scoresByParticipant.get(participant.id) ?? [];
    const rawScore = participantScores.reduce(
      (sum, row) => sum + Number(row.score ?? 0),
      0,
    );

    const deductionInfo = deductionMap.get(participant.id);
    const deduction = deductionInfo?.points ?? 0;
    const deductionReason = deductionInfo?.reason ?? "";
    const finalScore = rawScore - deduction;

    return {
      participantId: participant.id,
      participantNumber: participant.number,
      participantName: participant.name,
      rawScore,
      deduction,
      deductionReason,
      finalScore,
    };
  });

  const rankings = assignRanks(
    rankingsBase,
    (item) => item.finalScore,
    (item) => item.rawScore,
    (item) => item.participantNumber,
  );

  const judgeRankings: JudgeRankingGroup[] = judgeRows.map((judge) => {
    const baseRows = participantRows.map((participant) => {
      const criteriaScores: JudgeCriteriaScore[] = criteriaSorted.map((criterion) => ({
        criterionId: criterion.id,
        criterionName: criterion.name,
        score:
          scoreMap.get(`${judge.id}:${participant.id}:${criterion.id}`) ?? 0,
      }));

      const total = criteriaScores.reduce((sum, item) => sum + item.score, 0);

      return {
        judgeId: judge.id,
        judgeName: judge.displayName,
        participantId: participant.id,
        participantNumber: participant.number,
        participantName: participant.name,
        criteriaScores,
        total,
      };
    });

    const rankedRows = assignRanks(
      baseRows,
      (item) => item.total,
      undefined,
      (item) => item.participantNumber,
    );

    return {
      judgeId: judge.id,
      judgeName: judge.displayName,
      rows: rankedRows,
    };
  });

  const criteriaRankings: CriteriaRankingGroup[] = criteriaSorted.map((criterion) => {
    const baseRows = participantRows.map((participant) => {
      const scoresForCriterion = judgeRows.map((judge) => {
        return scoreMap.get(`${judge.id}:${participant.id}:${criterion.id}`) ?? 0;
      });

      const total = scoresForCriterion.reduce((sum, value) => sum + value, 0);
      const average =
        scoresForCriterion.length > 0 ? total / scoresForCriterion.length : 0;

      return {
        criterionId: criterion.id,
        criterionName: criterion.name,
        participantId: participant.id,
        participantNumber: participant.number,
        participantName: participant.name,
        score: average,
      };
    });

    const rankedRows = assignRanks(
      baseRows,
      (item) => item.score,
      undefined,
      (item) => item.participantNumber,
    );

    return {
      criterionId: criterion.id,
      criterionName: criterion.name,
      rows: rankedRows,
    };
  });

  return {
    event: {
      id: event.id,
      name: event.name,
      status: event.status,
    },
    rankings,
    judges: judgeRows,
    judgeRankings,
    criteriaRankings,
  };
}