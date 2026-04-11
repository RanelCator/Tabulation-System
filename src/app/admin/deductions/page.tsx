"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  ArrowLeft,
  Loader2,
  ShieldAlert,
  Trophy,
  MinusCircle,
} from "lucide-react";

type EventStatus = "draft" | "open" | "closed";

type EventItem = {
  id: string;
  name: string;
  status: EventStatus;
};

type RankingItem = {
  participantId: string;
  participantNumber: number;
  participantName: string;
  rawScore: number;
  deduction: number;
  deductionReason: string;
  finalScore: number;
  rank: number;
};

type DeductionFormState = {
  [participantId: string]: {
    points: string;
    reason: string;
  };
};

type EventsResponse = {
  events?: EventItem[];
};

type RankingsResponse = {
  rankings?: RankingItem[];
};

type MutationErrorResponse = {
  error?: string;
};

const STATUS_STYLES: Record<
  EventStatus,
  {
    label: string;
    badge: string;
    dot: string;
  }
> = {
  draft: {
    label: "Draft",
    badge: "border border-slate-700 bg-slate-800/70 text-slate-300",
    dot: "bg-slate-400",
  },
  open: {
    label: "Open",
    badge: "border border-emerald-900/50 bg-emerald-950/40 text-emerald-300",
    dot: "bg-emerald-400",
  },
  closed: {
    label: "Closed",
    badge: "border border-amber-900/50 bg-amber-950/40 text-amber-300",
    dot: "bg-amber-400",
  },
};

const swalBase = {
  background: "#0f172a",
  color: "#e2e8f0",
};

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function getErrorMessage(
  payload: MutationErrorResponse | null,
  fallback: string,
): string {
  return payload?.error ?? fallback;
}

async function showError(title: string, text: string): Promise<void> {
  await Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#2563eb",
    ...swalBase,
  });
}

async function showSuccess(title: string, text: string): Promise<void> {
  await Swal.fire({
    icon: "success",
    title,
    text,
    timer: 1400,
    showConfirmButton: false,
    ...swalBase,
  });
}

export default function DeductionsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [participants, setParticipants] = useState<RankingItem[]>([]);
  const [formState, setFormState] = useState<DeductionFormState>({});
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingParticipants, setIsLoadingParticipants] = useState(false);
  const [savingParticipantIds, setSavingParticipantIds] = useState<string[]>([]);

  const selectedEvent = useMemo(() => {
    return events.find((event) => event.id === selectedEventId) ?? null;
  }, [events, selectedEventId]);

  const stats = useMemo(() => {
    const totalRawScore = participants.reduce((sum, item) => sum + item.rawScore, 0);
    const totalDeduction = participants.reduce((sum, item) => sum + item.deduction, 0);
    const totalFinalScore = participants.reduce((sum, item) => sum + item.finalScore, 0);

    return {
      totalEvents: events.length,
      participantCount: participants.length,
      totalRawScore,
      totalDeduction,
      totalFinalScore,
    };
  }, [events.length, participants]);

  useEffect(() => {
    void loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      void loadParticipants(selectedEventId);
    } else {
      setParticipants([]);
      setFormState({});
    }
  }, [selectedEventId]);

  async function loadEvents(): Promise<void> {
    try {
      setIsLoadingEvents(true);

      const response = await fetch("/api/admin/events");
      const payload = await parseJsonSafe<EventsResponse>(response);
      const rows = payload?.events ?? [];

      setEvents(rows);

      if (rows.length > 0) {
        setSelectedEventId((current) => current || rows[0].id);
      }
    } finally {
      setIsLoadingEvents(false);
    }
  }

  async function loadParticipants(eventId: string): Promise<void> {
    try {
      setIsLoadingParticipants(true);

      const response = await fetch(`/api/admin/rankings?eventId=${eventId}`);
      const payload = await parseJsonSafe<RankingsResponse>(response);
      const rows = payload?.rankings ?? [];

      setParticipants(rows);

      const nextFormState: DeductionFormState = {};
      for (const item of rows) {
        nextFormState[item.participantId] = {
          points: String(item.deduction ?? 0),
          reason: item.deductionReason ?? "",
        };
      }

      setFormState(nextFormState);
    } finally {
      setIsLoadingParticipants(false);
    }
  }

  function updateField(
    participantId: string,
    field: "points" | "reason",
    value: string,
  ): void {
    setFormState((prev) => ({
      ...prev,
      [participantId]: {
        ...(prev[participantId] ?? { points: "0", reason: "" }),
        [field]: value,
      },
    }));
  }

  async function saveDeduction(participantId: string): Promise<void> {
    const payload = formState[participantId] ?? {
      points: "0",
      reason: "",
    };

    const parsedPoints = Number(payload.points);

    if (!Number.isFinite(parsedPoints) || parsedPoints < 0) {
      await showError(
        "Invalid deduction",
        "Deduction points must be a valid number greater than or equal to 0.",
      );
      return;
    }

    try {
      setSavingParticipantIds((prev) => [...prev, participantId]);

      const response = await fetch("/api/admin/deductions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventId: selectedEventId,
          participantId,
          points: payload.points,
          reason: payload.reason.trim(),
        }),
      });

      if (!response.ok) {
        const errorPayload = await parseJsonSafe<MutationErrorResponse>(response);

        await showError(
          "Failed to save deduction",
          getErrorMessage(errorPayload, "Unable to save deduction."),
        );
        return;
      }

      await loadParticipants(selectedEventId);
      await showSuccess("Deduction saved", "The deduction has been updated.");
    } finally {
      setSavingParticipantIds((prev) =>
        prev.filter((currentId) => currentId !== participantId),
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <div className="mb-5">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                <ShieldAlert className="h-7 w-7 text-blue-400" />
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-400">
                  Deduction Management
                </p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">
                  Deductions
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                  Apply manual deductions that affect final scoring and ranking.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Events" value={stats.totalEvents} />
              <StatCard label="Participants" value={stats.participantCount} />
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <section className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
              <div className="mb-5">
                <h2 className="text-lg font-semibold">Select Event</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose which event you want to manage deductions for.
                </p>
              </div>

              <div>
                <label
                  htmlFor="deduction-event"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Event
                </label>
                <select
                  id="deduction-event"
                  value={selectedEventId}
                  onChange={(event) => setSelectedEventId(event.target.value)}
                  disabled={isLoadingEvents || events.length === 0}
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="">Select event</option>
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedEvent ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 ring-1 ring-blue-500/20">
                      <Trophy className="h-4 w-4 text-blue-400" />
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-white">
                          {selectedEvent.name}
                        </p>
                        <EventStatusBadge status={selectedEvent.status} />
                      </div>
                      <p className="mt-1 break-all text-xs text-slate-500">
                        Event ID: {selectedEvent.id}
                      </p>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl">
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-lg font-semibold">Participant Deductions</h2>
                <p className="text-sm text-slate-400">
                  Review participant scores and apply manual deduction entries.
                </p>
              </div>

              <div className="max-w-xs">
                <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <p className="text-xs text-slate-500">Participants</p>
                  <p className="mt-1 text-lg font-semibold text-white">
                    {stats.participantCount}
                  </p>
                </div>
              </div>
            </div>

            {!selectedEventId ? (
              <EmptyState
                icon={<Trophy className="h-6 w-6 text-slate-400" />}
                title="No event selected"
                description="Select an event first before managing deductions."
              />
            ) : isLoadingParticipants ? (
              <div className="flex min-h-[260px] items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
                <div className="flex items-center gap-3 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading participants...
                </div>
              </div>
            ) : participants.length === 0 ? (
              <EmptyState
                icon={<ShieldAlert className="h-6 w-6 text-slate-400" />}
                title="No participants found"
                description="No ranking entries are available for the selected event."
              />
            ) : (
              <div className="space-y-4">
                {participants.map((participant) => (
                  <DeductionCard
                    key={participant.participantId}
                    item={participant}
                    formState={formState[participant.participantId]}
                    isSaving={savingParticipantIds.includes(participant.participantId)}
                    onChange={updateField}
                    onSave={saveDeduction}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function DeductionCard({
  item,
  formState,
  isSaving,
  onChange,
  onSave,
}: {
  item: RankingItem;
  formState:
    | {
        points: string;
        reason: string;
      }
    | undefined;
  isSaving: boolean;
  onChange: (
    participantId: string,
    field: "points" | "reason",
    value: string,
  ) => void;
  onSave: (participantId: string) => Promise<void>;
}) {
  const draftPoints = formState?.points ?? "0";
  const draftReason = formState?.reason ?? "";

  const parsedPoints = Number(draftPoints);
  const safePoints =
    Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0;

  const previewFinalScore = Math.max(item.rawScore - safePoints, 0);

  const isDirty =
    draftPoints !== String(item.deduction ?? 0) ||
    draftReason !== (item.deductionReason ?? "");

  const isValid = Number.isFinite(parsedPoints) && parsedPoints >= 0;
  const canSave = isDirty && isValid && !isSaving;

  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-slate-700">
      <div className="flex flex-col gap-4 border-b border-slate-800 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-white">
            #{item.participantNumber} - {item.participantName}
          </h3>
          <div className="mt-1">
            {(() => {
              const style = getRankStyle(item.rank);

              return (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.className}`}
                >
                  {style.icon && <span>{style.icon}</span>}
                  Rank #{item.rank}
                </span>
              );
            })()}
          </div>
          <p className="mt-1 break-all text-xs text-slate-500">
            Participant ID: {item.participantId}
          </p>
        </div>

        <div className="text-left lg:text-right">
          {isDirty ? (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              Unsaved changes
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className="h-2 w-2 rounded-full bg-slate-600" />
              No pending changes
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px]">
        <ScoreSummaryCard label="Raw Score" value={item.rawScore} tone="neutral" />
        <ScoreSummaryCard label="Current Deduction" value={item.deduction} tone="negative" />
        <ScoreSummaryCard label="Current Final" value={item.finalScore} tone="positive" />
        <ScoreSummaryCard label="Preview Final" value={previewFinalScore} tone="preview" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[180px_minmax(0,1fr)_220px]">
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Deduction Points
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={draftPoints}
            onChange={(event) =>
              onChange(item.participantId, "points", event.target.value)
            }
            placeholder="Deduction points"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
          {!isValid ? (
            <p className="mt-2 text-xs text-amber-400">
              Enter a valid number greater than or equal to 0.
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Reason
          </label>
          <input
            value={draftReason}
            onChange={(event) =>
              onChange(item.participantId, "reason", event.target.value)
            }
            placeholder="Reason (optional)"
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Actions
          </label>
          <button
            type="button"
            onClick={() => void onSave(item.participantId)}
            disabled={!canSave}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <MinusCircle className="h-4 w-4" />
                Save Deduction
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

function getRankStyle(rank: number) {
  if (rank === 1) {
    return {
      className:
        "border border-emerald-900/50 bg-emerald-950/40 text-emerald-300",
      icon: "🥇",
    };
  }

  if (rank <= 3) {
    return {
      className:
        "border border-amber-900/50 bg-amber-950/40 text-amber-300",
      icon: rank === 2 ? "🥈" : "🥉",
    };
  }

  return {
    className:
      "border border-blue-900/50 bg-blue-950/40 text-blue-300",
    icon: "",
  };
}

function EventStatusBadge({
  status,
}: {
  status: EventStatus;
}) {
  const meta = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium ${meta.badge}`}
    >
      <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
    </div>
  );
}

function DecimalStatCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value.toFixed(2)}</p>
    </div>
  );
}

function ScoreSummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "neutral" | "negative" | "positive" | "preview";
}) {
  const textStyle =
    tone === "negative"
      ? "text-rose-300"
      : tone === "positive"
        ? "text-emerald-300"
        : tone === "preview"
          ? "text-blue-300"
          : "text-white";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${textStyle}`}>
        {value.toFixed(2)}
      </p>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}