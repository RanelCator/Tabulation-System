import type { RouletteDrawMode } from "./types";

export function parseBulkParticipants(input: string): string[] {
  return [...new Set(
    input
      .split(/\r?\n|,/)
      .map((item) => item.trim())
      .filter(Boolean),
  )];
}

export function normalizeParticipantName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function pickRouletteWinner(params: {
  participants: Array<{
    id: string;
    name: string;
    isRemoved: boolean;
  }>;
  predeterminedWinnerId?: string | null;
}): {
  participantId: string;
  participantName: string;
  drawMode: RouletteDrawMode;
} | null {
  const eligibleParticipants = params.participants.filter(
    (participant) => !participant.isRemoved,
  );

  if (eligibleParticipants.length === 0) {
    return null;
  }

  const predeterminedWinner = params.predeterminedWinnerId
    ? eligibleParticipants.find(
        (participant) => participant.id === params.predeterminedWinnerId,
      )
    : null;

  if (predeterminedWinner) {
    return {
      participantId: predeterminedWinner.id,
      participantName: predeterminedWinner.name,
      drawMode: "predetermined",
    };
  }

  const randomIndex = Math.floor(Math.random() * eligibleParticipants.length);
  const winner = eligibleParticipants[randomIndex];

  return {
    participantId: winner.id,
    participantName: winner.name,
    drawMode: "random",
  };
}