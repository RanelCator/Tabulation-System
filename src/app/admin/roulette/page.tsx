// src/app/admin/roulette/page.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CircleDot,
  Loader2,
  Plus,
  RefreshCw,
  Ticket,
  Trophy,
} from "lucide-react";

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

type RouletteListResponse = {
  success: boolean;
  data?: RouletteSession[];
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

export default function RoulettePage() {
  const [sessions, setSessions] = useState<RouletteSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [removeWinnerAfterDraw, setRemoveWinnerAfterDraw] = useState(true);

  const totalSessions = useMemo(() => sessions.length, [sessions]);
  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === "active").length,
    [sessions],
  );

  async function loadSessions(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch("/api/roulette");
      const result = (await response.json()) as RouletteListResponse;

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to load roulette sessions.");
      }

      setSessions(result.data ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function handleCreateSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/roulette", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          removeWinnerAfterDraw,
        }),
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to create roulette session.");
      }

      setTitle("");
      setDescription("");
      setRemoveWinnerAfterDraw(true);

      await loadSessions(true);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to create session.");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-blue-400">
                Recorded Roulette
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">
                Roulette Sessions
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Create and manage saved roulette sessions, prepare participants
                ahead of time, and record all winners properly.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSessions(true)}
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
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Total Sessions</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {totalSessions}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Active Sessions</p>
              <p className="mt-1 text-2xl font-semibold text-emerald-300">
                {activeSessions}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Draft / Closed</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">
                {Math.max(totalSessions - activeSessions, 0)}
              </p>
            </div>
          </div>
        </section>

        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Create New Roulette Session
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Prepare a saved roulette record before the actual live draw.
            </p>
          </div>

          <form
            onSubmit={handleCreateSession}
            className="grid gap-4 lg:grid-cols-2"
          >
            <div className="lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Title
              </label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Lucky Draw Night"
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="lg:col-span-1">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Description
              </label>
              <input
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional description"
                className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 lg:col-span-2">
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
                onClick={() =>
                  setRemoveWinnerAfterDraw((previous) => !previous)
                }
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  removeWinnerAfterDraw ? "bg-blue-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    removeWinnerAfterDraw ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="lg:col-span-2">
              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create Session
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">
              Existing Sessions
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Open a session to manage participants, spin, and review winner
              history.
            </p>
          </div>

          {isLoading ? (
            <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/40">
              <div className="inline-flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading roulette sessions...
              </div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800">
                <Ticket className="h-6 w-6 text-slate-400" />
              </div>
              <h3 className="text-base font-semibold text-white">
                No roulette sessions yet
              </h3>
              <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                Create your first recorded roulette session to start preparing
                participants.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/50 p-5 transition hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-lg font-semibold text-white">
                          {session.title}
                        </h3>
                        <StatusBadge status={session.status} />
                      </div>

                      <p className="mt-2 text-sm text-slate-400">
                        {session.description || "No description provided."}
                      </p>
                    </div>

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20">
                      <Trophy className="h-5 w-5 text-blue-400" />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                      <p className="text-xs text-slate-500">Remove Winner</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {session.removeWinnerAfterDraw ? "Yes" : "No"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-3">
                      <p className="text-xs text-slate-500">Predetermined</p>
                      <p className="mt-1 text-sm font-semibold text-white">
                        {session.predeterminedWinnerId ? "Set" : "Random"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/roulette/${session.id}`}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
                    >
                      <CircleDot className="h-4 w-4" />
                      Open Session
                    </Link>
                  </div>

                  <p className="mt-4 text-xs text-slate-500">
                    Updated: {new Date(session.updatedAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}