// src/features/karaoke/components/karaoke-sessions-admin.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2, Plus, RefreshCw, MonitorPlay } from "lucide-react";
import Swal from "sweetalert2";

type KaraokeSession = {
  id: string;
  title: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

const swalBase = {
  background: "#0f172a",
  color: "#e2e8f0",
};

export function KaraokeSessionsAdmin() {
  const [sessions, setSessions] = useState<KaraokeSession[]>([]);
  const [title, setTitle] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);

  async function loadSessions(refreshing = false) {
    try {
      refreshing ? setIsRefreshing(true) : setIsLoading(true);

      const response = await fetch("/api/admin/karaoke/sessions", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to load sessions.");
      }

      setSessions(result.data);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: error instanceof Error ? error.message : "Failed to load sessions.",
        confirmButtonColor: "#2563eb",
        ...swalBase,
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) return;

    try {
      setIsCreating(true);

      const response = await fetch("/api/admin/karaoke/sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to create session.");
      }

      setTitle("");

      await Swal.fire({
        icon: "success",
        title: "Session Created",
        timer: 1400,
        showConfirmButton: false,
        ...swalBase,
      });

      await loadSessions(true);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title: error instanceof Error ? error.message : "Failed to create session.",
        confirmButtonColor: "#2563eb",
        ...swalBase,
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function activateSession(id: string) {
    try {
      setActivatingId(id);

      const response = await fetch(`/api/admin/karaoke/sessions/${id}/activate`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to activate session.");
      }

      await loadSessions(true);
    } catch (error) {
      await Swal.fire({
        icon: "error",
        title:
          error instanceof Error ? error.message : "Failed to activate session.",
        confirmButtonColor: "#2563eb",
        ...swalBase,
      });
    } finally {
      setActivatingId(null);
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="flex min-h-screen items-center justify-center">
          <div className="inline-flex items-center gap-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading karaoke sessions...
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Karaoke Sessions
              </h1>
              <p className="mt-2 text-sm text-slate-400">
                Create and activate karaoke sessions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSessions(true)}
              disabled={isRefreshing}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm font-medium transition hover:bg-slate-800 disabled:opacity-50"
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
        </section>

        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Create Session</h2>
            <p className="mt-1 text-sm text-slate-400">
              Example: Friday Karaoke Night.
            </p>

            <form onSubmit={createSession} className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Session Title
                </label>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Karaoke Night"
                  className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={isCreating || !title.trim()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold transition hover:bg-blue-700 disabled:opacity-50"
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
            </form>
          </section>

          <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Sessions</h2>
            <p className="mt-1 text-sm text-slate-400">
              Only one session should be active at a time.
            </p>

            <div className="mt-5 space-y-3">
              {sessions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12 text-center text-sm text-slate-400">
                  No karaoke sessions yet.
                </div>
              ) : (
                sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{session.title}</p>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                            session.isActive
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                              : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          {session.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        Created: {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {!session.isActive && (
                        <button
                          type="button"
                          onClick={() => void activateSession(session.id)}
                          disabled={activatingId === session.id}
                          className="inline-flex h-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
                        >
                          {activatingId === session.id ? "Activating..." : "Activate"}
                        </button>
                      )}

                      <Link
                        href={`/admin/karaoke/${session.id}`}
                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold transition hover:bg-blue-700"
                      >
                        <MonitorPlay className="h-4 w-4" />
                        Open
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}