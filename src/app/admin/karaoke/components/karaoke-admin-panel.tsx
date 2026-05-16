// src/features/karaoke/components/karaoke-admin-panel.tsx
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronsUp,
  Loader2,
  MonitorPlay,
  Music2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  SkipForward,
  Square,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";

type QueueItem = {
  id: string;
  singerName: string;
  youtubeVideoId: string;
  youtubeUrl: string;
  title: string | null;
  thumbnailUrl: string | null;
  queueNumber: number;
  status: "queued" | "playing" | "played" | "skipped" | "removed";
};

type AdminData = {
  session: {
    id: string;
    title: string;
    isActive: boolean;
  } | null;
  currentItem: QueueItem | null;
  queue: QueueItem[];
};

const swalBase = {
  background: "#0f172a",
  color: "#e2e8f0",
};

async function showError(title: string, text = "") {
  await Swal.fire({
    icon: "error",
    title,
    text,
    confirmButtonColor: "#2563eb",
    ...swalBase,
  });
}

async function showSuccess(title: string, text = "") {
  await Swal.fire({
    icon: "success",
    title,
    text,
    timer: 1400,
    showConfirmButton: false,
    ...swalBase,
  });
}

export function KaraokeAdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);

  const [singerName, setSingerName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddingSong, setIsAddingSong] = useState(false);
  const [isPlayingNext, setIsPlayingNext] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const [removingId, setRemovingId] = useState<string | null>(null);
  const [forcingId, setForcingId] = useState<string | null>(null);

  const queuedCount = data?.queue.length ?? 0;
  const nextSong = useMemo(() => data?.queue[0] ?? null, [data?.queue]);

  const filteredQueue = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    if (!keyword) return data?.queue ?? [];

    return (data?.queue ?? []).filter((item) => {
      const title = item.title?.toLowerCase() ?? "";
      const singer = item.singerName.toLowerCase();
      const videoId = item.youtubeVideoId.toLowerCase();

      return (
        title.includes(keyword) ||
        singer.includes(keyword) ||
        videoId.includes(keyword)
      );
    });
  }, [data?.queue, searchTerm]);

  async function loadData(showRefreshing = false) {
    try {
      if (showRefreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const response = await fetch("/api/admin/karaoke", {
        cache: "no-store",
      });

      const result = (await response.json()) as {
        success: boolean;
        data?: AdminData;
        message?: string;
      };

      if (!response.ok || !result.success || !result.data) {
        throw new Error(result.message ?? "Failed to load karaoke admin.");
      }

      setData(result.data);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to load karaoke admin.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }

  async function addSong(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!singerName.trim() || !youtubeUrl.trim()) return;

    try {
      setIsAddingSong(true);

      const response = await fetch("/api/admin/karaoke/queue", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          singerName,
          youtubeUrl,
        }),
      });

      const text = await response.text();

      let result: {
        success: boolean;
        message?: string;
      };

      try {
        result = JSON.parse(text);
      } catch {
        throw new Error(
          `API did not return JSON. Status: ${response.status}. Check if /api/admin/karaoke/queue exists.`,
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to add song.");
      }

      await showSuccess("Song Added", "Song has been added to the queue.");
      setSingerName("");
      setYoutubeUrl("");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to add song.",
      );
    } finally {
      setIsAddingSong(false);
    }
  }

  async function playNext() {
    try {
      setIsPlayingNext(true);

      const response = await fetch("/api/admin/karaoke/play-next", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to play next song.");
      }

      await showSuccess("Now Playing", "Next song is now active.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to play next song.",
      );
    } finally {
      setIsPlayingNext(false);
    }
  }

  async function forceNext(item: QueueItem) {
    const confirmed = await Swal.fire({
      icon: "question",
      title: "Force this song next?",
      text: `${item.title ?? item.youtubeVideoId} will be moved to the top of the queue.`,
      showCancelButton: true,
      confirmButtonText: "Force Next",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#2563eb",
      cancelButtonColor: "#475569",
      reverseButtons: true,
      ...swalBase,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setForcingId(item.id);

      const response = await fetch(
        `/api/admin/karaoke/queue/${item.id}/force-next`,
        {
          method: "POST",
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to force song next.");
      }

      await showSuccess("Queue Updated", "Song has been moved to next queue.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to force song next.",
      );
    } finally {
      setForcingId(null);
    }
  }

  async function pauseCurrent() {
    try {
      setIsPausing(true);

      const response = await fetch("/api/admin/karaoke/pause-current", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to pause current song.");
      }

      await showSuccess("Paused", "Current song has been paused.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to pause current song.",
      );
    } finally {
      setIsPausing(false);
    }
  }

  async function endCurrent() {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "End current song?",
      text: "The current song will be marked as played.",
      showCancelButton: true,
      confirmButtonText: "End Song",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#475569",
      reverseButtons: true,
      ...swalBase,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsEnding(true);

      const response = await fetch("/api/admin/karaoke/end-current", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to end current song.");
      }

      await showSuccess("Song Ended", "Current song has been marked as played.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to end current song.",
      );
    } finally {
      setIsEnding(false);
    }
  }

  async function skipCurrent() {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Skip current song?",
      text: "The current song will be marked as skipped.",
      showCancelButton: true,
      confirmButtonText: "Skip Song",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#f97316",
      cancelButtonColor: "#475569",
      reverseButtons: true,
      ...swalBase,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setIsSkipping(true);

      const response = await fetch("/api/admin/karaoke/skip-current", {
        method: "POST",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to skip current song.");
      }

      await showSuccess("Song Skipped", "Current song has been skipped.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to skip current song.",
      );
    } finally {
      setIsSkipping(false);
    }
  }

  async function removeItem(item: QueueItem) {
    const confirmed = await Swal.fire({
      icon: "warning",
      title: "Remove song?",
      text: `${item.title ?? item.youtubeVideoId} will be removed from the queue.`,
      showCancelButton: true,
      confirmButtonText: "Remove",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#475569",
      reverseButtons: true,
      ...swalBase,
    });

    if (!confirmed.isConfirmed) return;

    try {
      setRemovingId(item.id);

      const response = await fetch(`/api/admin/karaoke/queue/${item.id}`, {
        method: "DELETE",
      });

      const result = (await response.json()) as {
        success: boolean;
        message?: string;
      };

      if (!response.ok || !result.success) {
        throw new Error(result.message ?? "Failed to remove song.");
      }

      await showSuccess("Removed", "Song has been removed from the queue.");
      await loadData(true);
    } catch (error) {
      console.error(error);
      await showError(
        error instanceof Error ? error.message : "Failed to remove song.",
      );
    } finally {
      setRemovingId(null);
    }
  }

  useEffect(() => {
    void loadData();

    const interval = setInterval(() => {
      void loadData(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="inline-flex items-center gap-3 text-sm text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading karaoke admin...
          </div>
        </div>
      </main>
    );
  }

  if (!data?.session) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-xl font-semibold text-white">
              No active karaoke session found
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Create or activate a karaoke session first.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="mb-6 rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {data.session.title}
                </h1>

                <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  Active
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Manage the karaoke queue, current song, and live display.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => void loadData(true)}
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
                href="/admin/karaoke/live"
                target="_blank"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <MonitorPlay className="h-4 w-4" />
                Open Live Display
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Queued Songs</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {queuedCount}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Now Playing</p>
              <p className="mt-1 truncate text-2xl font-semibold text-emerald-300">
                {data.currentItem ? "Active" : "None"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Next Singer</p>
              <p className="mt-1 truncate text-2xl font-semibold text-blue-300">
                {nextSong?.singerName ?? "-"}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4">
              <p className="text-xs text-slate-500">Session</p>
              <p className="mt-1 text-2xl font-semibold text-amber-300">
                Live
              </p>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">Add Song</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Insert a YouTube song with participant name.
                </p>
              </div>

              <form onSubmit={addSong} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    Participant Name
                  </label>
                  <input
                    value={singerName}
                    onChange={(event) => setSingerName(event.target.value)}
                    placeholder="Example: Juan Dela Cruz"
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">
                    YouTube Link
                  </label>
                  <input
                    value={youtubeUrl}
                    onChange={(event) => setYoutubeUrl(event.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="h-11 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={
                      isAddingSong || !singerName.trim() || !youtubeUrl.trim()
                    }
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAddingSong ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Add to Queue
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSingerName("");
                      setYoutubeUrl("");
                    }}
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
                    Queue List
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    Songs waiting to be played.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => void playNext()}
                  disabled={isPlayingNext || queuedCount === 0}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isPlayingNext ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Play Next
                    </>
                  )}
                </button>
              </div>

              <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 px-4">
                <Search className="h-4 w-4 shrink-0 text-slate-500" />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search singer, song title, or YouTube ID..."
                  className="h-11 w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                />
              </div>

              {filteredQueue.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12 text-center">
                  <Music2 className="mx-auto h-8 w-8 text-slate-600" />
                  <p className="mt-3 text-sm text-slate-400">
                    {searchTerm.trim()
                      ? "No matching songs found."
                      : "No songs in queue yet."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredQueue.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-sm font-bold text-white">
                          #{item.queueNumber}
                        </div>

                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="h-16 w-24 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900">
                            <Music2 className="h-5 w-5 text-slate-500" />
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {item.title ?? item.youtubeVideoId}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Singer: {item.singerName}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void forceNext(item)}
                          disabled={forcingId === item.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-medium text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {forcingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ChevronsUp className="h-4 w-4" />
                          )}
                          Force Next
                        </button>

                        <button
                          type="button"
                          onClick={() => void removeItem(item)}
                          disabled={removingId === item.id}
                          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {removingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Remove
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
                  Now Playing
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Current song shown on the live display.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-800 bg-slate-950/60 p-6">
                {data.currentItem ? (
                  <div className="space-y-4">
                    {data.currentItem.thumbnailUrl ? (
                      <img
                        src={data.currentItem.thumbnailUrl}
                        alt=""
                        className="aspect-video w-full rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex aspect-video w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-900">
                        <Music2 className="h-10 w-10 text-slate-600" />
                      </div>
                    )}

                    <div>
                      <p className="text-base font-semibold text-white">
                        {data.currentItem.title ??
                          data.currentItem.youtubeVideoId}
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Singer: {data.currentItem.singerName}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void skipCurrent()}
                      disabled={isSkipping}
                      className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-500/30 bg-orange-500/10 px-4 text-sm font-semibold text-orange-300 transition hover:bg-orange-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSkipping ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Skipping...
                        </>
                      ) : (
                        <>
                          <SkipForward className="h-4 w-4" />
                          Skip Current
                        </>
                      )}
                    </button>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => void pauseCurrent()}
                        disabled={isPausing}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isPausing ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Pausing...
                          </>
                        ) : (
                          <>
                            <Pause className="h-4 w-4" />
                            Pause
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => void endCurrent()}
                        disabled={isEnding}
                        className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isEnding ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Ending...
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4" />
                            End Song
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-950/40 px-6 py-12 text-center">
                    <Music2 className="mx-auto h-8 w-8 text-slate-600" />
                    <p className="mt-3 text-sm text-slate-400">
                      Nothing is playing.
                    </p>
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Live Page Access
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Use this screen for OBS or TV display.
                </p>
              </div>

              <Link
                href="/admin/karaoke/live"
                target="_blank"
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <MonitorPlay className="h-4 w-4" />
                Open Live Display
              </Link>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}