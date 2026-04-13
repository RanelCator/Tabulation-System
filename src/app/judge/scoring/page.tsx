"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Loader2,
  Save,
  Trophy,
  UserRound,
  X,
  BarChart3,
} from "lucide-react";

type Participant = {
  id: string;
  name: string;
  number: number;
};

type Criterion = {
  id: string;
  name: string;
  maxScore: string;
};

type EventStatus = "draft" | "open" | "closed" | "";

type ScoreState = Record<string, Record<string, string>>;

type DraftMeta = {
  updatedAt: string;
};

type LocalDraftPayload = {
  scores: ScoreState;
  meta?: DraftMeta;
};

export default function ScoringPage() {
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [eventId, setEventId] = useState("");
  const [eventName, setEventName] = useState("");
  const [eventStatus, setEventStatus] = useState<EventStatus>("");
  const [scores, setScores] = useState<ScoreState>({});
  const [selectedParticipantId, setSelectedParticipantId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string>("");
  const [isParticipantNavOpen, setIsParticipantNavOpen] = useState(false);

  const totalPossibleScore = useMemo(() => {
    return criteria.reduce((sum, criterion) => {
      return sum + Number(criterion.maxScore || 0);
    }, 0);
  }, [criteria]);

  const selectedParticipant = useMemo(() => {
    return (
      participants.find(
        (participant) => participant.id === selectedParticipantId,
      ) ?? null
    );
  }, [participants, selectedParticipantId]);

  const selectedParticipantIndex = useMemo(() => {
    return participants.findIndex(
      (participant) => participant.id === selectedParticipantId,
    );
  }, [participants, selectedParticipantId]);

  const hasPreviousParticipant = selectedParticipantIndex > 0;
  const hasNextParticipant =
    selectedParticipantIndex >= 0 &&
    selectedParticipantIndex < participants.length - 1;

  const storageKey = useMemo(() => {
    return eventId ? `judge-scoring-draft:${eventId}` : "";
  }, [eventId]);

  const quickRanking = useMemo(() => {
  const ranked = participants
    .filter((participant) => isParticipantValid(participant.id))
    .map((participant) => ({
      participantId: participant.id,
      participantName: participant.name,
      participantNumber: participant.number,
      totalScore: getParticipantTotal(participant.id),
    }))
    .sort((a, b) => b.totalScore - a.totalScore)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
    }));

  const incomplete = participants
    .filter((participant) => !isParticipantComplete(participant.id))
    .map((participant) => ({
      participantId: participant.id,
      participantName: participant.name,
      participantNumber: participant.number,
      status: "incomplete" as const,
    }));

  const invalid = participants
    .filter(
      (participant) =>
        isParticipantComplete(participant.id) &&
        !isParticipantValid(participant.id),
    )
    .map((participant) => ({
      participantId: participant.id,
      participantName: participant.name,
      participantNumber: participant.number,
      status: "invalid" as const,
    }));

  return {
    ranked,
    incomplete,
    invalid,
  };
}, [participants, scores, criteria]);

  function goToPreviousParticipant() {
    if (!hasPreviousParticipant) return;

    const previousParticipant = participants[selectedParticipantIndex - 1];
    if (!previousParticipant) return;

    setSelectedParticipantId(previousParticipant.id);
  }

  function goToNextParticipant() {
    if (!hasNextParticipant) return;

    const nextParticipant = participants[selectedParticipantIndex + 1];
    if (!nextParticipant) return;

    setSelectedParticipantId(nextParticipant.id);
  }

  function selectParticipant(participantId: string) {
    setSelectedParticipantId(participantId);
    setIsParticipantNavOpen(false);
  }

  function getScoreValue(participantId: string, criterionId: string) {
    return scores[participantId]?.[criterionId] ?? "";
  }

  function getNumericScore(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function isOverMax(participantId: string, criterion: Criterion) {
    const value = getScoreValue(participantId, criterion.id);
    if (value === "") return false;

    const numericValue = getNumericScore(value);
    if (numericValue === null) return false;

    return numericValue > Number(criterion.maxScore);
  }

  function isBelowMin(participantId: string, criterion: Criterion) {
    const value = getScoreValue(participantId, criterion.id);
    if (value === "") return false;

    const numericValue = getNumericScore(value);
    if (numericValue === null) return false;

    return numericValue < 0;
  }

  function isInvalidScore(participantId: string, criterion: Criterion) {
    return (
      isOverMax(participantId, criterion) ||
      isBelowMin(participantId, criterion)
    );
  }

  function getParticipantTotal(participantId: string) {
    return criteria.reduce((sum, criterion) => {
      const rawValue = getScoreValue(participantId, criterion.id);
      const numericValue = getNumericScore(rawValue);

      if (numericValue === null) return sum;
      return sum + numericValue;
    }, 0);
  }

  function isParticipantComplete(participantId: string) {
    return criteria.every((criterion) => {
      const value = getScoreValue(participantId, criterion.id);
      return value !== "";
    });
  }

  function isParticipantValid(participantId: string) {
    return criteria.every((criterion) => {
      const rawValue = getScoreValue(participantId, criterion.id);
      if (rawValue === "") return false;

      const numericValue = getNumericScore(rawValue);
      const maxValue = Number(criterion.maxScore);

      return (
        numericValue !== null &&
        numericValue >= 0 &&
        numericValue <= maxValue
      );
    });
  }

  function getParticipantStatus(participantId: string) {
    if (!isParticipantComplete(participantId)) return "incomplete";
    if (!isParticipantValid(participantId)) return "invalid";
    return "ready";
  }

  const readyParticipantsCount = useMemo(() => {
    return participants.filter((participant) =>
      isParticipantValid(participant.id),
    ).length;
  }, [participants, scores, criteria]);

  const allParticipantsReady = useMemo(() => {
    if (participants.length === 0) return false;

    return participants.every((participant) =>
      isParticipantValid(participant.id),
    );
  }, [participants, scores, criteria]);

  useEffect(() => {
    async function loadScoringData() {
      try {
        setIsLoading(true);

        const response = await fetch("/api/judge/scoring");
        const data = await response.json();

        const nextParticipants: Participant[] = data.participants ?? [];
        const nextCriteria: Criterion[] = data.criteria ?? [];

        setParticipants(nextParticipants);
        setCriteria(nextCriteria);
        setEventId(data.event?.id ?? "");
        setEventName(data.event?.name ?? "");
        setEventStatus(data.event?.status ?? "");

        if (nextParticipants.length > 0) {
          setSelectedParticipantId(nextParticipants[0].id);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void loadScoringData();
  }, []);

  useEffect(() => {
    if (!storageKey) return;

    try {
      const rawDraft = window.localStorage.getItem(storageKey);

      if (!rawDraft) {
        setHasLoadedDraft(true);
        return;
      }

      const parsedDraft = JSON.parse(rawDraft) as LocalDraftPayload;

      setScores(parsedDraft.scores ?? {});
      setLastSavedAt(parsedDraft.meta?.updatedAt ?? "");
    } catch {
      // ignore invalid local draft
    } finally {
      setHasLoadedDraft(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey || !hasLoadedDraft) return;

    const payload: LocalDraftPayload = {
      scores,
      meta: {
        updatedAt: new Date().toISOString(),
      },
    };

    window.localStorage.setItem(storageKey, JSON.stringify(payload));
    setLastSavedAt(payload.meta?.updatedAt ?? "");
  }, [scores, storageKey, hasLoadedDraft]);

  function updateScore(participantId: string, criterionId: string, value: string) {
    setScores((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] ?? {}),
        [criterionId]: value,
      },
    }));
  }

  async function submitAllScores() {
    if (!eventId || participants.length === 0) return;

    if (eventStatus === "closed") {
      await Swal.fire({
        icon: "warning",
        title: "Submission not allowed",
        text: "This event is already closed. Score submission is no longer allowed.",
        confirmButtonColor: "#2563eb",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (eventStatus !== "open") {
      await Swal.fire({
        icon: "warning",
        title: "Submission not allowed",
        text: `This event is ${eventStatus || "not ready"}. Score submission is only allowed when the event is open.`,
        confirmButtonColor: "#2563eb",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (!allParticipantsReady) {
      await Swal.fire({
        icon: "warning",
        title: "Incomplete scores",
        text: "Please complete all contestant scores before submitting.",
        confirmButtonColor: "#2563eb",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Submit all scores?",
      text: "This will submit all locally prepared scores for every contestant.",
      showCancelButton: true,
      confirmButtonText: "Yes, submit all",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#475569",
      background: "#0f172a",
      color: "#e2e8f0",
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsSubmittingAll(true);

      for (const participant of participants) {
        const scoresData = Object.entries(scores[participant.id] || {}).map(
          ([criterionId, score]) => ({
            criterionId,
            score,
          }),
        );

        const response = await fetch("/api/judge/score", {
          method: "POST",
          body: JSON.stringify({
            eventId,
            participantId: participant.id,
            scoresData,
          }),
          headers: { "Content-Type": "application/json" },
        });

        if (!response.ok) {
          const data = await response.json().catch(() => null);

          await Swal.fire({
            icon: "error",
            title: "Submission failed",
            text:
              data?.error ??
              `Failed to submit scores for participant #${participant.number} - ${participant.name}`,
            confirmButtonColor: "#2563eb",
            background: "#0f172a",
            color: "#e2e8f0",
          });
          return;
        }
      }

      await Swal.fire({
        icon: "success",
        title: "Scores submitted",
        text: "All contestant scores were submitted successfully.",
        confirmButtonColor: "#2563eb",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSubmittingAll(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <Link
              href="/judge"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Judge Dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">
                  Judge Scoring Panel
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Scoring
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Enter scores per contestant, save drafts locally, and submit all final scores when ready.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-slate-500">Event</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {eventName || "Loading event..."}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-slate-500">Event Status</p>
                <p
                  className={`mt-1 text-sm font-semibold capitalize ${
                    eventStatus === "open"
                      ? "text-emerald-400"
                      : eventStatus === "closed"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {eventStatus || "Unknown"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                <p className="text-xs text-slate-500">Ready for Submission</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {readyParticipantsCount} / {participants.length}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Submit unlocks only when all contestants are valid
                </p>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading scoring data...
            </div>
          </div>
        ) : participants.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900 px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
              <Trophy className="h-6 w-6 text-slate-400" />
            </div>
            <h2 className="text-base font-semibold text-white">
              No participants available
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              There are no participants assigned to this scoring session yet.
            </p>
          </div>
        ) : (
          <>
            <section className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div>
  <label className="mb-2 block text-sm font-medium text-slate-300">
    Contestant
  </label>

  <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
    <button
      type="button"
      onClick={goToPreviousParticipant}
      disabled={!hasPreviousParticipant}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <ChevronLeft className="h-4 w-4" />
      <span className="hidden sm:inline">Previous</span>
    </button>

    <button
      type="button"
      onClick={() => setIsParticipantNavOpen(true)}
      className="flex h-11 w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 text-left text-sm text-white outline-none transition hover:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          {selectedParticipant
            ? `#${selectedParticipant.number} - ${selectedParticipant.name}`
            : "Select contestant"}
        </p>
        <p className="text-xs text-slate-500">
          {selectedParticipantIndex >= 0
            ? `Participant ${selectedParticipantIndex + 1} of ${participants.length}`
            : "No contestant selected"}
        </p>
      </div>

      <ChevronDown className="ml-3 h-4 w-4 shrink-0 text-slate-400" />
    </button>

    <button
      type="button"
      onClick={goToNextParticipant}
      disabled={!hasNextParticipant}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="hidden sm:inline">Next</span>
      <ChevronRight className="h-4 w-4" />
    </button>
  </div>
</div>

                <button
                  type="button"
                  onClick={submitAllScores}
                  disabled={
                    !allParticipantsReady ||
                    isSubmittingAll ||
                    eventStatus !== "open"
                  }
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSubmittingAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Submitting All...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Submit All Scores
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-3 text-xs">
                <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-slate-300">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Drafts are saved locally on this device
                </span>

                {lastSavedAt ? (
                  <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1 text-slate-400">
                    Last local save: {new Date(lastSavedAt).toLocaleString()}
                  </span>
                ) : null}
              </div>
            </section>

            {selectedParticipant ? (
              <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl">
                <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20">
                      <UserRound className="h-5 w-5 text-blue-400" />
                    </div>

                    <div>
                      <h2 className="text-base font-semibold text-white">
                        #{selectedParticipant.number} - {selectedParticipant.name}
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        Scoring draft loads automatically from local storage when available
                      </p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                    <p className="text-xs text-slate-500">Current Total</p>
                    <p className="mt-1 text-lg font-semibold text-white">
                      {getParticipantTotal(selectedParticipant.id).toFixed(2)} /{" "}
                      {totalPossibleScore.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {criteria.map((criterion) => {
                    const maxScore = Number(criterion.maxScore);
                    const overMax = isOverMax(selectedParticipant.id, criterion);
                    const belowMin = isBelowMin(selectedParticipant.id, criterion);
                    const invalid = isInvalidScore(selectedParticipant.id, criterion);

                    return (
                      <div
                        key={criterion.id}
                        className={`rounded-2xl border p-4 transition ${
                          invalid
                            ? "border-red-500/50 bg-red-950/20"
                            : "border-slate-800 bg-slate-950/60"
                        }`}
                      >
                        <div className="mb-3">
                          <h3 className="text-sm font-semibold text-white">
                            {criterion.name}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500">
                            Maximum score: {maxScore.toFixed(2)}
                          </p>
                        </div>

                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={getScoreValue(selectedParticipant.id, criterion.id)}
                          onChange={(e) =>
                            updateScore(
                              selectedParticipant.id,
                              criterion.id,
                              e.target.value,
                            )
                          }
                          className={`h-11 w-full rounded-xl border px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:ring-2 ${
                            invalid
                              ? "border-red-500 bg-red-950/20 focus:border-red-500 focus:ring-red-500/20"
                              : "border-slate-700 bg-slate-900 focus:border-blue-500 focus:ring-blue-500/20"
                          }`}
                          placeholder={`0 - ${maxScore}`}
                        />

                        {overMax ? (
                          <p className="mt-2 inline-flex items-center gap-2 text-xs text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Exceeds maximum allowed score of {maxScore.toFixed(2)}
                          </p>
                        ) : belowMin ? (
                          <p className="mt-2 inline-flex items-center gap-2 text-xs text-red-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Score cannot be below 0
                          </p>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Enter a value from 0 to {maxScore.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>

      {participants.length > 0 ? (
        <div className="fixed bottom-24 right-6 z-40 flex flex-col gap-3">
          <button
            type="button"
            onClick={goToPreviousParticipant}
            disabled={!hasPreviousParticipant}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous participant"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={() => setIsParticipantNavOpen(true)}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-blue-500/30 bg-blue-600 text-white shadow-lg transition hover:bg-blue-700"
            aria-label="Open participant selector"
          >
            <span className="text-sm font-bold">
              {selectedParticipant?.number ?? "-"}
            </span>
          </button>

          <button
            type="button"
            onClick={goToNextParticipant}
            disabled={!hasNextParticipant}
            className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-white shadow-lg transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next participant"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setIsRankingModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex h-12 w-12 items-center justify-center gap-2 rounded-full border border-blue-500/30 bg-emerald-600 text-sm font-semibold text-white shadow-lg transition hover:bg-blue-700"
      >
        <BarChart3 className="h-4 w-4" />
      </button>

      {isParticipantNavOpen ? (
  <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/80 sm:items-center">
    <div className="w-full rounded-t-3xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-w-xl sm:rounded-3xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-base font-semibold text-white">
            Select Participant
          </h2>
          <p className="text-sm text-slate-400">
            Jump quickly to any contestant
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsParticipantNavOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-4">
        <div className="space-y-2">
          {participants.map((participant, index) => {
            const status = getParticipantStatus(participant.id);

            const statusClassName =
              status === "ready"
                ? "text-emerald-300 border-emerald-900/40 bg-emerald-950/20"
                : status === "invalid"
                  ? "text-rose-300 border-rose-900/40 bg-rose-950/20"
                  : "text-amber-300 border-amber-900/40 bg-amber-950/20";

            const statusLabel =
              status === "ready"
                ? "Ready"
                : status === "invalid"
                  ? "Invalid"
                  : "Incomplete";

            const isActive = participant.id === selectedParticipantId;

            return (
              <button
                key={participant.id}
                type="button"
                onClick={() => selectParticipant(participant.id)}
                className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                  isActive
                    ? "border-blue-500/50 bg-blue-600/10"
                    : "border-slate-800 bg-slate-950/60 hover:bg-slate-800/80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">
                      #{participant.number} - {participant.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Participant {index + 1} of {participants.length}
                    </p>
                  </div>

                  <span
                    className={`inline-flex shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${statusClassName}`}
                  >
                    {statusLabel}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  </div>
) : null}

      {isRankingModalOpen ? (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
    <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Quick Ranking Preview</h2>
          <p className="text-sm text-slate-400">
            Based on your current local scoring draft for this event.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsRankingModalOpen(false)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900 text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[70vh] overflow-y-auto px-5 py-5">
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Ranked</p>
            <p className="mt-1 text-lg font-semibold text-white">
              {quickRanking.ranked.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Incomplete</p>
            <p className="mt-1 text-lg font-semibold text-amber-300">
              {quickRanking.incomplete.length}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
            <p className="text-xs text-slate-500">Invalid</p>
            <p className="mt-1 text-lg font-semibold text-rose-300">
              {quickRanking.invalid.length}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {quickRanking.ranked.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-10 text-center">
              <p className="text-sm text-slate-400">
                No valid ranking preview available yet.
              </p>
            </div>
          ) : (
            quickRanking.ranked.map((item) => (
              <div
                key={item.participantId}
                className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RankBadge rank={item.rank} />
                    <p className="truncate text-sm font-semibold text-white">
                      #{item.participantNumber} - {item.participantName}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Score</p>
                  <p className="text-sm font-semibold text-white">
                    {item.totalScore.toFixed(2)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {quickRanking.incomplete.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-amber-300">
              Incomplete Participants
            </h3>
            <div className="space-y-2">
              {quickRanking.incomplete.map((item) => (
                <div
                  key={item.participantId}
                  className="rounded-xl border border-amber-900/40 bg-amber-950/20 px-4 py-3 text-sm text-amber-200"
                >
                  #{item.participantNumber} - {item.participantName}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {quickRanking.invalid.length > 0 ? (
          <div className="mt-6">
            <h3 className="mb-3 text-sm font-semibold text-rose-300">
              Invalid Participants
            </h3>
            <div className="space-y-2">
              {quickRanking.invalid.map((item) => (
                <div
                  key={item.participantId}
                  className="rounded-xl border border-rose-900/40 bg-rose-950/20 px-4 py-3 text-sm text-rose-200"
                >
                  #{item.participantNumber} - {item.participantName}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  </div>
) : null}
    </main>

    
  );

  
}



function RankBadge({
  rank,
}: {
  rank: number;
}) {
  const className =
    rank === 1
      ? "border border-emerald-900/50 bg-emerald-950/40 text-emerald-300"
      : rank <= 3
        ? "border border-amber-900/50 bg-amber-950/40 text-amber-300"
        : "border border-slate-700 bg-slate-800/70 text-slate-300";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      Rank #{rank}
    </span>
  );
}