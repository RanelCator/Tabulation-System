export type RouletteSessionStatus = "draft" | "active" | "closed";
export type RouletteDrawMode = "random" | "predetermined";

export type RouletteSession = {
  id: string;
  title: string;
  description: string | null;
  status: RouletteSessionStatus;
  removeWinnerAfterDraw: boolean;
  predeterminedWinnerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RouletteParticipant = {
  id: string;
  sessionId: string;
  name: string;
  orderNo: number;
  isRemoved: boolean;
  createdAt: string;
};

export type RouletteDrawResult = {
  id: string;
  sessionId: string;
  participantId: string;
  winnerNameSnapshot: string;
  drawMode: RouletteDrawMode;
  createdAt: string;
};