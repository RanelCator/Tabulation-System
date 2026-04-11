"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Trophy,
  Download,
  Printer,
} from "lucide-react";

type EventItem = {
  id: string;
  name: string;
  status: "draft" | "open" | "closed";
};

type RankingItem = {
  participantId: string;
  participantNumber: number;
  participantName: string;
  rawScore: number;
  deduction: number;
  finalScore: number;
  rank: number;
};

export default function RankingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventName, setEventName] = useState("");

  useEffect(() => {
    async function loadEvents() {
      const res = await fetch("/api/admin/events");
      const data = await res.json();

      setEvents(data.events ?? []);
      if (data.events?.length) {
        setSelectedEventId(data.events[0].id);
      }
    }

    void loadEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;

    async function loadRankings() {
      setIsLoading(true);

      const res = await fetch(
        `/api/admin/rankings?eventId=${selectedEventId}`,
      );
      const data = await res.json();

      setRankings(data.rankings ?? []);
      setEventName(data.event?.name ?? "");

      setIsLoading(false);
    }

    void loadRankings();
  }, [selectedEventId]);

  const hasRows = useMemo(() => rankings.length > 0, [rankings]);

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* HEADER */}
        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-4">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600/10">
              <Trophy className="h-7 w-7 text-blue-400" />
            </div>

            <div>
              <h1 className="text-2xl font-bold">Rankings</h1>
              <p className="mt-1 text-sm text-slate-400">
                Final results including scores, deductions, and rankings.
              </p>
            </div>
          </div>
        </div>

        {/* EVENT SELECT */}
        <div className="mb-6 max-w-sm">
          <label className="text-sm text-slate-300">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-2 w-full h-11 rounded-xl border border-slate-700 bg-slate-900 px-3"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.status})
              </option>
            ))}
          </select>
        </div>

        {/* EVENT TITLE + ACTIONS */}
        {eventName && (
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold">{eventName}</h2>

            <div className="flex gap-3">
              <button
                onClick={() =>
                  (window.location.href = `/api/admin/rankings/export?eventId=${selectedEventId}`)
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Export
              </button>

              <button
                onClick={() =>
                  window.open(
                    `/admin/rankings/print?eventId=${selectedEventId}`,
                    "_blank",
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
            </div>
          </div>
        )}

        {/* CONTENT */}
        {isLoading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : !hasRows ? (
          <div className="rounded-xl border border-slate-800 p-6 text-center text-slate-400">
            No ranking data available.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-900 text-sm text-slate-400">
                  <th className="px-4 py-3 text-left">Rank</th>
                  <th className="px-4 py-3 text-left">No.</th>
                  <th className="px-4 py-3 text-left">Participant</th>
                  <th className="px-4 py-3 text-left">Raw</th>
                  <th className="px-4 py-3 text-left text-red-400">
                    Deduction
                  </th>
                  <th className="px-4 py-3 text-left text-emerald-400">
                    Final
                  </th>
                </tr>
              </thead>

              <tbody>
                {rankings.map((item) => (
                  <tr
                    key={item.participantId}
                    className="border-t border-slate-800 text-sm hover:bg-slate-900/50"
                  >
                    <td className="px-4 py-3 font-bold">
                      {item.rank <= 3 ? (
                        <span className="text-yellow-400">
                          🏆 {item.rank}
                        </span>
                      ) : (
                        item.rank
                      )}
                    </td>

                    <td className="px-4 py-3">
                      {item.participantNumber}
                    </td>

                    <td className="px-4 py-3 font-medium">
                      {item.participantName}
                    </td>

                    <td className="px-4 py-3">
                      {item.rawScore.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 text-red-400">
                      -{item.deduction.toFixed(2)}
                    </td>

                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {item.finalScore.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}