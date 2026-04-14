"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MonitorPlay,
  RefreshCw,
  RotateCcw,
  Users,
  XCircle,
} from "lucide-react";
import Swal from "sweetalert2";

type RouletteSession = {
  id: string;
  title: string;
  description: string | null;
  status: "draft" | "active" | "closed";
  removeWinnerAfterDraw: boolean;
  predeterminedWinnerId: string | null;
  createdAt: string;
  updatedAt: string;
};

type RouletteParticipant = {
  id: string;
  sessionId: string;
  name: string;
  orderNo: number;
  isRemoved: boolean;
  createdAt: string;
};

type RouletteDrawResult = {
  id: string;
  sessionId: string;
  participantId: string;
  winnerNameSnapshot: string;
  drawMode: "random" | "predetermined";
  createdAt: string;
};

type RouletteDetailResponse = {
  success: boolean;
  data?: {
    session: RouletteSession;
    participants: RouletteParticipant[];
    drawResults: RouletteDrawResult[];
  };
  message?: string;
};

function StatusBadge({
  status,
}: {
  status: RouletteSession["status"];
}) {
  const className =
    status === "active"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
      : status === "closed"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-300"
        : "border-amber-500/30 bg-amber-500/10 text-amber-300";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${className}`}
    >
      {status}
    </span>
  );
}

  const swalBase = {
    background: "#0f172a",
    color: "#e2e8f0",
  };

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

export default function RouletteDetailPage() {
  const params = useParams<{ id: string }>();
  const sessionId = typeof params?.id === "string" ? params.id : "";

  const [session, setSession] = useState<RouletteSession | null>(null);
  const [participants, setParticipants] = useState<RouletteParticipant[]>([]);
  const [drawResults, setDrawResults] = useState<RouletteDrawResult[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);
  const [isRestoringAll, setIsRestoringAll] = useState(false);

  const [bulkInput, setBulkInput] = useState("");

  const activeParticipants = useMemo(
    () => participants.filter((participant) => !participant.isRemoved),
    [participants],
  );

  const removedParticipants = useMemo(
    () => participants.filter((participant) => participant.isRemoved),
    [participants],
  );



  async function loadSession(id: string, showRefreshing = false) {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch(`/api/roulette/${id}`);
      const result = (await response.json()) as RouletteDetailResponse;

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load roulette session.");
      }

      setSession(result.data.session);
      setParticipants(result.data.participants);
      setDrawResults(result.data.drawResults);
    } catch (error) {
      console.error(error);
      await showError(
          error instanceof Error ? error.message : "Failed to load session.", ""
      );
      //alert(error instanceof Error ? error.message : "");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;
    void loadSession(sessionId);
  }, [sessionId]);

  async function updateSession(payload: Partial<RouletteSession>) {
    if (!sessionId) return;

    try {
      setIsSavingSettings(true);

      const response = await fetch(`/api/roulette/${sessionId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to update roulette session.");
      }

      await loadSession(sessionId, true);
    } catch (error) {
      console.error(error);
      await showError(
          error instanceof Error ? error.message : "Failed to save settings.", ""
      );
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function handleAddParticipants(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!bulkInput.trim() || !sessionId) return;

    try {
      setIsAddingParticipants(true);

      const response = await fetch(
        `/api/roulette/${sessionId}/participants/bulk`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bulkInput,
          }),
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error( result.message ?? "Failed to add participants.");
      }

      await showSuccess("Participants Added", "New participants have been added successfully.");
      setBulkInput("");
      await loadSession(sessionId, true);
    } catch (error) {
      console.error(error);
      await showError(
          error instanceof Error ? error.message : "Failed to add participants.", ""
      );
    } finally {
      setIsAddingParticipants(false);
    }
  }

  async function handleRestoreAll() {
    if (!sessionId) return;

    try {
      setIsRestoringAll(true);

      const response = await fetch(`/api/roulette/${sessionId}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          restoreAll: true,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to restore participants.");
      }
      await showSuccess("Participants Restored", "All removed participants have been restored.");
      await loadSession(sessionId, true);
    } catch (error) {
      console.error(error);
      await showError(
          error instanceof Error ? error.message : "Failed to restore participants.", ""
      );
      //alert(error instanceof Error ? error.message : "Failed to restore participants.");
    } finally {
      setIsRestoringAll(false);
    }
  }

  

  async function handleRestoreParticipant(participantId: string) {
    if (!sessionId) return;

    const confirmed = await Swal.fire({
      icon: "question",
      title: "Restore participant?",
      text: `"${name}" will be eligible again for the draw.`,
      showCancelButton: true,
      confirmButtonText: "Restore",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#22c55e",
      cancelButtonColor: "#475569",
      ...swalBase,
    });

    if (!confirmed.isConfirmed) return;

    try {
      const response = await fetch(`/api/roulette/${sessionId}/restore`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          participantId,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        await showError(
          "Failed to restore participant",
          result.message ?? "An error occurred while restoring the participant.",
        );
        //throw new Error(result.message ?? "Failed to restore participant.");
      }
      await showSuccess("Participant Restored", "The participant has been restored successfully.");
      await loadSession(sessionId, true);
    } catch (error) {
      console.error(error);
      await showError(
        "Failed to restore participant",
        error instanceof Error ? error.message : "Failed to restore participant.",
      );
    }
  }

async function handleDeleteParticipant(participantId: string) {
  if (!sessionId) return;

  const result = await Swal.fire({
    title: "Delete Participant?",
    text: "This action cannot be undone.",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#64748b",
    confirmButtonText: "Yes, delete it",
    cancelButtonText: "Cancel",
    reverseButtons: true,
    ...swalBase,
  });

  if (!result.isConfirmed) return;

  try {
    const response = await fetch(
      `/api/roulette/${sessionId}/participants/${participantId}`,
      {
        method: "DELETE",
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message ?? "Delete failed");
    }

    await Swal.fire({
      title: "Deleted!",
      text: "Participant has been removed.",
      icon: "success",
      timer: 1500,
      showConfirmButton: false,
      ...swalBase,
    });

    await loadSession(sessionId, true);
  } catch (error) {
    console.error(error);

    await Swal.fire({
      title: "Error",
      text:
        error instanceof Error
          ? error.message
          : "Failed to delete participant.",
      icon: "error",
      ...swalBase,
    });
  }
}

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="inline-flex items-center gap-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading roulette session...
          </div>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">
              Roulette session not found
            </h1>
            <Link
              href="/admin/roulette"
              className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Back to Roulette
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <Link
              href="/admin/roulette"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Roulette Sessions
            </Link>
          </div>

          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {session.title}
                </h1>
                <StatusBadge status={session.status} />
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                {session.description || "No description provided."}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadSession(sessionId, true)}
                disabled={isRefreshing}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRefreshing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                  </>
                )}
              </button>

              <Link
                href={`/admin/roulette/${session.id}/live`}
                target="_blank"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <MonitorPlay className="h-4 w-4" />
                Open Live Page
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Total Participants</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {participants.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Eligible</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {activeParticipants.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Removed</p>
              <p className="mt-1 text-2xl font-semibold text-rose-300">
                {removedParticipants.length}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Recorded Winners</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">
                {drawResults.length}
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Configure session behavior before opening the live page.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Status
                  </label>
                  <select
                    value={session.status}
                    onChange={(event) =>
                      void updateSession({
                        status: event.target.value as RouletteSession["status"],
                      })
                    }
                    disabled={isSavingSettings}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="draft">Draft</option>
                    <option value="active">Active</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Predetermined Winner
                  </label>
                  <select
                    value={session.predeterminedWinnerId ?? ""}
                    onChange={(event) =>
                      void updateSession({
                        predeterminedWinnerId: event.target.value || null,
                      })
                    }
                    disabled={isSavingSettings}
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Random draw</option>
                    {activeParticipants.map((participant) => (
                      <option key={participant.id} value={participant.id}>
                        #{participant.orderNo} - {participant.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2 flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-white">
                      Remove winner after draw
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Winner becomes ineligible for the next spin.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isSavingSettings}
                    onClick={() =>
                      void updateSession({
                        removeWinnerAfterDraw: !session.removeWinnerAfterDraw,
                      })
                    }
                    className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                      session.removeWinnerAfterDraw
                        ? "bg-blue-600"
                        : "bg-slate-700"
                    }`}
                  >
                    <span
                      className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                        session.removeWinnerAfterDraw
                          ? "translate-x-6"
                          : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Bulk Add Participants
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  One participant per line.
                </p>
              </div>

              <form onSubmit={handleAddParticipants}>
                <textarea
                  value={bulkInput}
                  onChange={(event) => setBulkInput(event.target.value)}
                  rows={8}
                  placeholder={"Person 1\nPerson 2\nPerson 3"}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />

                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isAddingParticipants || !bulkInput.trim()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingParticipants ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Users className="h-4 w-4" />
                        Add Participants
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setBulkInput("")}
                    className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Participants
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Manage eligible and removed participants.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void handleRestoreAll()}
                  disabled={isRestoringAll || removedParticipants.length === 0}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRestoringAll ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Restoring...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Restore All Removed
                    </>
                  )}
                </button>
              </div>

              {participants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12 text-center">
                  <p className="text-sm text-slate-400">
                    No participants added yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div
                      key={participant.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            #{participant.orderNo} - {participant.name}
                          </p>

                          {participant.isRemoved ? (
                            <span className="inline-flex items-center rounded-full border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-300">
                              Removed
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                              Eligible
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {participant.isRemoved && (
                          <button
                            type="button"
                            onClick={() => void handleRestoreParticipant(participant.id)}
                            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => void handleDeleteParticipant(participant.id)}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20"
                        >
                          <XCircle className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Live Page Access
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Open the live page to run the roulette draw.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="text-xs text-slate-500">Mode</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {session.predeterminedWinnerId ? "Predetermined" : "Random"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
                    <p className="text-xs text-slate-500">Remove Winner</p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {session.removeWinnerAfterDraw ? "Enabled" : "Disabled"}
                    </p>
                  </div>

                  <Link
                    href={`/admin/roulette/${session.id}/live`}
                    target="_blank"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    <MonitorPlay className="h-4 w-4" />
                    Open Live Display
                  </Link>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Winner History
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Recorded spin results for this session.
                </p>
              </div>

              {drawResults.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12 text-center">
                  <p className="text-sm text-slate-400">
                    No winners recorded yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {drawResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-semibold text-white">
                              #{drawResults.length - index} - {result.winnerNameSnapshot}
                            </p>

                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium capitalize ${
                                result.drawMode === "predetermined"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                                  : "border-blue-500/30 bg-blue-500/10 text-blue-300"
                              }`}
                            >
                              {result.drawMode}
                            </span>
                          </div>

                          <p className="mt-2 text-xs text-slate-500">
                            {new Date(result.createdAt).toLocaleString()}
                          </p>
                        </div>

                        {result.drawMode === "predetermined" ? (
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-amber-300" />
                        ) : (
                          <XCircle className="h-5 w-5 shrink-0 text-blue-300" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}