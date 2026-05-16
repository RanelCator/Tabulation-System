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

type JudgeItem = {
  id: string;
  displayName: string;
};

type ParticipantItem = {
  id: string;
  number: number;
  name?: string;
  coser?: string;
  character?: string;
  seriesTitle?: string;
};

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
  deductionReason: string;
  finalScore: number;
  rank: number;
};

type JudgeCriteriaScore = {
  criterionId: string;
  criterionName: string;
  score: number;
};

type JudgeRankingRow = {
  judgeId: string;
  judgeName: string;
  participantId: string;
  participantNumber: number;
  participantName: string;
  criteriaScores: JudgeCriteriaScore[];
  total: number;
  rank: number;
};

type JudgeRankingGroup = {
  judgeId: string;
  judgeName: string;
  rows: JudgeRankingRow[];
};

type CriteriaRankingRow = {
  criterionId: string;
  criterionName: string;
  participantId: string;
  participantNumber: number;
  participantName: string;
  score: number;
  rank: number;
};

type CriteriaRankingGroup = {
  criterionId: string;
  criterionName: string;
  rows: CriteriaRankingRow[];
};

type RankingsResponse = {
  event?: {
    id: string;
    name: string;
    status: "draft" | "open" | "closed";
  };
  rankings?: RankingItem[];
  judges?: JudgeItem[];
  participants?: ParticipantItem[];
  judgeRankings?: JudgeRankingGroup[];
  criteriaRankings?: CriteriaRankingGroup[];
};

type RankingView =
  | "overall"
  | "judges"
  | "criteria"
  | "participants"
  | "participantsBlank";

export default function RankingsPage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [judgeRankings, setJudgeRankings] = useState<JudgeRankingGroup[]>([]);
  const [criteriaRankings, setCriteriaRankings] = useState<CriteriaRankingGroup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventName, setEventName] = useState("");
  const [activeView, setActiveView] = useState<RankingView>("overall");
  const [judges, setJudges] = useState<JudgeItem[]>([]);

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

      try {
        const res = await fetch(`/api/admin/rankings?eventId=${selectedEventId}`);
        const data = (await res.json()) as RankingsResponse;

        setJudges(data.judges ?? []);
        setParticipants(data.participants ?? []);
        setRankings(data.rankings ?? []);
        setJudgeRankings(data.judgeRankings ?? []);
        setCriteriaRankings(data.criteriaRankings ?? []);
        setEventName(data.event?.name ?? "");
      } finally {
        setIsLoading(false);
      }
    }

    void loadRankings();
  }, [selectedEventId]);

  const hasOverallRows = useMemo(() => rankings.length > 0, [rankings]);
  const hasJudgeRows = useMemo(() => judgeRankings.length > 0, [judgeRankings]);
  const hasCriteriaRows = useMemo(() => criteriaRankings.length > 0, [criteriaRankings]);
  const hasParticipantRows = useMemo(() => participants.length > 0, [participants]);

  function sanitizeFileName(value: string) {
    return value
      .trim()
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
      .replace(/\s+/g, "-")
      .toLowerCase();
  }

  function escapeHtml(value: string) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getParticipantInfo(participant: ParticipantItem) {
    return {
      number: participant.number ?? "",
      coser: participant.coser ?? participant.name ?? "",
      character: participant.character ?? "",
      seriesTitle: participant.seriesTitle ?? "",
    };
  }

  function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
    const csvContent = rows
      .map((row) =>
        row
          .map((cell) => {
            const value = String(cell ?? "");
            const escaped = value.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  function printTable(title: string, tableHtml: string) {
    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(title)}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              font-family: Arial, Helvetica, sans-serif;
              padding: 0;
              margin: 0;
              color: #111827;
              background: #ffffff;
            }

            .page {
              padding: 8px 4px;
            }

            h1 {
              margin: 0 0 16px;
              font-size: 22px;
              color: #0f172a;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }

            th, td {
              border: 1px solid #94a3b8;
              padding: 8px 10px;
              text-align: left;
              font-size: 13px;
              vertical-align: middle;
              word-wrap: break-word;
            }

            th {
              background: #e2e8f0;
              color: #0f172a;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.03em;
            }

            tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .text-center {
              text-align: center;
            }

            .text-right {
              text-align: right;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <h1>${escapeHtml(title)}</h1>
            ${tableHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function renderRank(rank: number) {
    if (rank <= 3) {
      return <span className="text-yellow-400">🏆 {rank}</span>;
    }

    return rank;
  }

  function renderEmptyState(message: string) {
    return (
      <div className="rounded-xl border border-slate-800 p-6 text-center text-slate-400">
        {message}
      </div>
    );
  }

  function exportOverallCsv() {
    const rows: Array<Array<string | number>> = [
      ["Rank", "No.", "Participant", "Raw", "Deduction", "Reason", "Final"],
      ...rankings.map((item) => [
        item.rank,
        item.participantNumber,
        item.participantName,
        item.rawScore.toFixed(2),
        item.deduction.toFixed(2),
        item.deductionReason || "",
        item.finalScore.toFixed(2),
      ]),
    ];

    downloadCsv(
      `${sanitizeFileName(eventName || "event")}-overall-rankings.csv`,
      rows,
    );
  }

  function exportParticipantsCsv() {
    const rows: Array<Array<string | number>> = [
      ["Participant Number", "Coser", "Character", "Series Title"],
      ...participants.map((participant) => {
        const info = getParticipantInfo(participant);

        return [
          info.number,
          info.coser,
          info.character,
          info.seriesTitle,
        ];
      }),
    ];

    downloadCsv(
      `${sanitizeFileName(eventName || "event")}-participants.csv`,
      rows,
    );
  }

  function exportParticipantsBlankCsv() {
    const rows: Array<Array<string | number>> = [
      ["#", "Coser", "Character", "Series Title"],
      ...participants.map((participant) => {
        const info = getParticipantInfo(participant);

        return [
          "",
          info.coser,
          info.character,
          info.seriesTitle,
        ];
      }),
    ];

    downloadCsv(
      `${sanitizeFileName(eventName || "event")}-participants-list.csv`,
      rows,
    );
  }

  function exportJudgeCsv(judge: JudgeRankingGroup) {
    const headers = [
      "Rank",
      "No.",
      "Participant",
      ...(judge.rows[0]?.criteriaScores.map((item) => item.criterionName) ?? []),
      "Total",
    ];

    const rows: Array<Array<string | number>> = [
      headers,
      ...judge.rows.map((row) => [
        row.rank,
        row.participantNumber,
        row.participantName,
        ...row.criteriaScores.map((item) => item.score.toFixed(2)),
        row.total.toFixed(2),
      ]),
    ];

    downloadCsv(
      `${sanitizeFileName(eventName || "event")}-${sanitizeFileName(judge.judgeName)}-rankings.csv`,
      rows,
    );
  }

  function exportCriterionCsv(criterion: CriteriaRankingGroup) {
    const rows: Array<Array<string | number>> = [
      ["Rank", "No.", "Participant", "Score"],
      ...criterion.rows.map((row) => [
        row.rank,
        row.participantNumber,
        row.participantName,
        row.score.toFixed(2),
      ]),
    ];

    downloadCsv(
      `${sanitizeFileName(eventName || "event")}-${sanitizeFileName(criterion.criterionName)}-rankings.csv`,
      rows,
    );
  }

  function printParticipantsTable() {
    const rowsHtml = participants
      .map((participant) => {
        const info = getParticipantInfo(participant);

        return `
          <tr>
            <td class="text-center">${escapeHtml(String(info.number))}</td>
            <td>${escapeHtml(info.coser)}</td>
            <td>${escapeHtml(info.character)}</td>
            <td>${escapeHtml(info.seriesTitle)}</td>
          </tr>
        `;
      })
      .join("");

    const tableHtml = `
      <table>
        <colgroup>
          <col style="width: 18%;" />
          <col style="width: 28%;" />
          <col style="width: 27%;" />
          <col style="width: 27%;" />
        </colgroup>
        <thead>
          <tr>
            <th>Participant Number</th>
            <th>Coser</th>
            <th>Character</th>
            <th>Series Title</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    printTable(`${eventName} - Participants`, tableHtml);
  }

  function printParticipantsBlankTable() {
    const rowsHtml = participants
      .map((participant) => {
        const info = getParticipantInfo(participant);

        return `
          <tr>
            <td></td>
            <td>${escapeHtml(info.coser)}</td>
            <td>${escapeHtml(info.character)}</td>
            <td>${escapeHtml(info.seriesTitle)}</td>
          </tr>
        `;
      })
      .join("");

    const tableHtml = `
      <table>
        <colgroup>
          <col style="width: 10%;" />
          <col style="width: 30%;" />
          <col style="width: 30%;" />
          <col style="width: 30%;" />
        </colgroup>
        <thead>
          <tr>
            <th>#</th>
            <th>Coser</th>
            <th>Character</th>
            <th>Series Title</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    `;

    printTable(`${eventName} - Participants List`, tableHtml);
  }

  function printOverallTable() {
    const rowsHtml = rankings
      .map((item) => {
        const rankClass =
          item.rank === 1
            ? "rank-cell rank-1"
            : item.rank === 2
              ? "rank-cell rank-2"
              : item.rank === 3
                ? "rank-cell rank-3"
                : "rank-cell";

        return `
          <tr>
            <td class="${rankClass}">${item.rank}</td>
            <td class="col-number">${item.participantNumber}</td>
            <td class="col-participant">${escapeHtml(item.participantName)}</td>
            <td class="col-final text-right">${item.finalScore.toFixed(2)}</td>
          </tr>
        `;
      })
      .join("");

    const signaturesHtml =
      judges.length > 0
        ? `
          <div class="signatures">
            ${judges
              .map(
                (judge) => `
                  <div class="signature-box">
                    <div class="signature-line"></div>
                    <div class="signature-name">${escapeHtml(judge.displayName)}</div>
                    <div class="signature-label">Judge</div>
                  </div>
                `,
              )
              .join("")}
          </div>
        `
        : "";

    const printWindow = window.open("", "_blank", "width=1200,height=800");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(`${eventName} - Overall Rankings`)}</title>
          <style>
            @page {
              size: A4;
              margin: 12mm;
            }

            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #111827;
              background: #ffffff;
            }

            .page {
              padding: 8px 4px;
            }

            .report-header {
              margin-bottom: 18px;
            }

            .report-title {
              margin: 0;
              font-size: 28px;
              font-weight: 700;
              color: #0f172a;
            }

            .report-subtitle {
              margin-top: 6px;
              font-size: 12px;
              color: #475569;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
              margin-top: 14px;
              border: 1.5px solid #94a3b8;
            }

            col.col-rank {
              width: 14%;
            }

            col.col-no {
              width: 14%;
            }

            col.col-participant {
              width: 48%;
            }

            col.col-final {
              width: 24%;
            }

            thead th {
              background: #e2e8f0;
              color: #0f172a;
              font-size: 13px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.03em;
              border: 1px solid #94a3b8;
              padding: 10px 12px;
              text-align: left;
            }

            tbody td {
              border: 1px solid #cbd5e1;
              padding: 11px 12px;
              font-size: 14px;
              vertical-align: middle;
            }

            tbody tr:nth-child(even) {
              background: #f8fafc;
            }

            .text-right {
              text-align: right;
            }

            .col-number {
              text-align: center;
            }

            .col-final {
              font-weight: 700;
              text-align: right;
            }

            .rank-cell {
              text-align: center;
              font-weight: 700;
            }

            .rank-1 {
              background: #fef3c7;
              color: #92400e;
              font-size: 16px;
              font-weight: 800;
            }

            .rank-2 {
              background: #e5e7eb;
              color: #374151;
              font-size: 15px;
              font-weight: 800;
            }

            .rank-3 {
              background: #fde68a;
              color: #78350f;
              font-size: 15px;
              font-weight: 800;
            }

            .signatures {
              display: grid;
              grid-template-columns: repeat(2, minmax(240px, 1fr));
              gap: 52px 40px;
              margin-top: 56px;
            }

            .signature-box {
              padding-top: 20px;
              text-align: center;
            }

            .signature-line {
              width: 100%;
              border-top: 1.5px solid #1f2937;
              margin-bottom: 8px;
            }

            .signature-name {
              font-size: 14px;
              font-weight: 700;
              color: #0f172a;
            }

            .signature-label {
              margin-top: 4px;
              font-size: 12px;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.04em;
            }

            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          <div class="page">
            <div class="report-header">
              <h1 class="report-title">${escapeHtml(eventName)} - Overall Rankings</h1>
              <div class="report-subtitle">Official Results Summary</div>
            </div>

            <table>
              <colgroup>
                <col class="col-rank" />
                <col class="col-no" />
                <col class="col-participant" />
                <col class="col-final" />
              </colgroup>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>No.</th>
                  <th>Participant</th>
                  <th>Final</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>

            ${signaturesHtml}
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  }

  function printJudgeTable(judge: JudgeRankingGroup) {
    const headerHtml = `
      <tr>
        <th>Rank</th>
        <th>No.</th>
        <th>Participant</th>
        ${(judge.rows[0]?.criteriaScores ?? [])
          .map((item) => `<th>${escapeHtml(item.criterionName)}</th>`)
          .join("")}
        <th>Total</th>
      </tr>
    `;

    const rowsHtml = judge.rows
      .map(
        (row) => `
          <tr>
            <td>${row.rank}</td>
            <td>${row.participantNumber}</td>
            <td>${escapeHtml(row.participantName)}</td>
            ${row.criteriaScores
              .map((item) => `<td class="text-right">${item.score.toFixed(2)}</td>`)
              .join("")}
            <td class="text-right">${row.total.toFixed(2)}</td>
          </tr>
        `,
      )
      .join("");

    const tableHtml = `
      <table>
        <thead>${headerHtml}</thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    printTable(`${eventName} - ${judge.judgeName}`, tableHtml);
  }

  function printCriterionTable(criterion: CriteriaRankingGroup) {
    const rowsHtml = criterion.rows
      .map(
        (row) => `
          <tr>
            <td>${row.rank}</td>
            <td>${row.participantNumber}</td>
            <td>${escapeHtml(row.participantName)}</td>
            <td class="text-right">${row.score.toFixed(2)}</td>
          </tr>
        `,
      )
      .join("");

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>No.</th>
            <th>Participant</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;

    printTable(`${eventName} - ${criterion.criterionName}`, tableHtml);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-7xl px-4 py-6">
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
                Overall results, per judge totals, per criterion rankings, and participants list.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-6 max-w-sm">
          <label className="text-sm text-slate-300">Event</label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-3"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} ({event.status})
              </option>
            ))}
          </select>
        </div>

        {eventName && (
          <>
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold">{eventName}</h2>

              <div className="flex flex-wrap gap-3">
                {activeView === "overall" && (
                  <>
                    <button
                      onClick={exportOverallCsv}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>

                    <button
                      onClick={printOverallTable}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </>
                )}

                {activeView === "participants" && (
                  <>
                    <button
                      onClick={exportParticipantsCsv}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>

                    <button
                      onClick={printParticipantsTable}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </>
                )}

                {activeView === "participantsBlank" && (
                  <>
                    <button
                      onClick={exportParticipantsBlankCsv}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Download className="h-4 w-4" />
                      Export CSV
                    </button>

                    <button
                      onClick={printParticipantsBlankTable}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="mb-6 flex flex-wrap gap-2">
              <button
                onClick={() => setActiveView("overall")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  activeView === "overall"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Overall
              </button>

              <button
                onClick={() => setActiveView("judges")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  activeView === "judges"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Per Judge
              </button>

              <button
                onClick={() => setActiveView("criteria")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  activeView === "criteria"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Per Criterion
              </button>

              <button
                onClick={() => setActiveView("participants")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  activeView === "participants"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Participants
              </button>

              <button
                onClick={() => setActiveView("participantsBlank")}
                className={`rounded-xl px-4 py-2 text-sm transition ${
                  activeView === "participantsBlank"
                    ? "bg-blue-600 text-white"
                    : "border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800"
                }`}
              >
                Participants List
              </button>
            </div>
          </>
        )}

        {isLoading ? (
          <div className="flex justify-center py-10 text-slate-400">
            <Loader2 className="animate-spin" />
          </div>
        ) : (
          <>
            {activeView === "overall" &&
              (hasOverallRows ? (
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
                        <th className="px-4 py-3 text-left">Reason</th>
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
                            {renderRank(item.rank)}
                          </td>
                          <td className="px-4 py-3">{item.participantNumber}</td>
                          <td className="px-4 py-3 font-medium">
                            {item.participantName}
                          </td>
                          <td className="px-4 py-3">{item.rawScore.toFixed(2)}</td>
                          <td className="px-4 py-3 text-red-400">
                            -{item.deduction.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {item.deductionReason || "—"}
                          </td>
                          <td className="px-4 py-3 font-semibold text-emerald-400">
                            {item.finalScore.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                renderEmptyState("No overall ranking data available.")
              ))}

            {activeView === "judges" &&
              (hasJudgeRows ? (
                <div className="space-y-6">
                  {judgeRankings.map((judge) => {
                    const criteriaHeaders = judge.rows[0]?.criteriaScores ?? [];

                    return (
                      <section
                        key={judge.judgeId}
                        className="overflow-hidden rounded-2xl border border-slate-800"
                      >
                        <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 md:flex-row md:items-center md:justify-between">
                          <h3 className="font-semibold">{judge.judgeName}</h3>

                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => exportJudgeCsv(judge)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                            >
                              <Download className="h-4 w-4" />
                              Export CSV
                            </button>

                            <button
                              onClick={() => printJudgeTable(judge)}
                              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                            >
                              <Printer className="h-4 w-4" />
                              Print
                            </button>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="min-w-full">
                            <thead>
                              <tr className="bg-slate-900/60 text-sm text-slate-400">
                                <th className="px-4 py-3 text-left">Rank</th>
                                <th className="px-4 py-3 text-left">No.</th>
                                <th className="px-4 py-3 text-left">Participant</th>
                                {criteriaHeaders.map((criterion) => (
                                  <th
                                    key={criterion.criterionId}
                                    className="px-4 py-3 text-left"
                                  >
                                    {criterion.criterionName}
                                  </th>
                                ))}
                                <th className="px-4 py-3 text-left text-emerald-400">
                                  Total
                                </th>
                              </tr>
                            </thead>

                            <tbody>
                              {judge.rows.map((row) => (
                                <tr
                                  key={`${judge.judgeId}-${row.participantId}`}
                                  className="border-t border-slate-800 text-sm hover:bg-slate-900/40"
                                >
                                  <td className="px-4 py-3 font-bold">
                                    {renderRank(row.rank)}
                                  </td>
                                  <td className="px-4 py-3">
                                    {row.participantNumber}
                                  </td>
                                  <td className="px-4 py-3 font-medium">
                                    {row.participantName}
                                  </td>
                                  {row.criteriaScores.map((criterionScore) => (
                                    <td
                                      key={`${row.participantId}-${criterionScore.criterionId}`}
                                      className="px-4 py-3"
                                    >
                                      {criterionScore.score.toFixed(2)}
                                    </td>
                                  ))}
                                  <td className="px-4 py-3 font-semibold text-emerald-400">
                                    {row.total.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </section>
                    );
                  })}
                </div>
              ) : (
                renderEmptyState("No per-judge ranking data available.")
              ))}

            {activeView === "criteria" &&
              (hasCriteriaRows ? (
                <div className="space-y-6">
                  {criteriaRankings.map((criterion) => (
                    <section
                      key={criterion.criterionId}
                      className="overflow-hidden rounded-2xl border border-slate-800"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900 px-4 py-3 md:flex-row md:items-center md:justify-between">
                        <h3 className="font-semibold">{criterion.criterionName}</h3>

                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => exportCriterionCsv(criterion)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                          >
                            <Download className="h-4 w-4" />
                            Export CSV
                          </button>

                          <button
                            onClick={() => printCriterionTable(criterion)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-1.5 text-sm hover:bg-slate-800"
                          >
                            <Printer className="h-4 w-4" />
                            Print
                          </button>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="bg-slate-900/60 text-sm text-slate-400">
                              <th className="px-4 py-3 text-left">Rank</th>
                              <th className="px-4 py-3 text-left">No.</th>
                              <th className="px-4 py-3 text-left">Participant</th>
                              <th className="px-4 py-3 text-left text-emerald-400">
                                Score
                              </th>
                            </tr>
                          </thead>

                          <tbody>
                            {criterion.rows.map((row) => (
                              <tr
                                key={`${criterion.criterionId}-${row.participantId}`}
                                className="border-t border-slate-800 text-sm hover:bg-slate-900/40"
                              >
                                <td className="px-4 py-3 font-bold">
                                  {renderRank(row.rank)}
                                </td>
                                <td className="px-4 py-3">
                                  {row.participantNumber}
                                </td>
                                <td className="px-4 py-3 font-medium">
                                  {row.participantName}
                                </td>
                                <td className="px-4 py-3 font-semibold text-emerald-400">
                                  {row.score.toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </div>
              ) : (
                renderEmptyState("No per-criterion ranking data available.")
              ))}

            {activeView === "participants" &&
              (hasParticipantRows ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-900 text-sm text-slate-400">
                        <th className="w-40 px-4 py-3 text-left">
                          Participant Number
                        </th>
                        <th className="px-4 py-3 text-left">Coser</th>
                        <th className="px-4 py-3 text-left">Character</th>
                        <th className="px-4 py-3 text-left">Series Title</th>
                      </tr>
                    </thead>

                    <tbody>
                      {participants.map((participant) => {
                        const info = getParticipantInfo(participant);

                        return (
                          <tr
                            key={participant.id}
                            className="border-t border-slate-800 text-sm hover:bg-slate-900/50"
                          >
                            <td className="px-4 py-3">{info.number}</td>
                            <td className="px-4 py-3 font-medium">{info.coser}</td>
                            <td className="px-4 py-3">{info.character}</td>
                            <td className="px-4 py-3">{info.seriesTitle}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                renderEmptyState("No participants available.")
              ))}

            {activeView === "participantsBlank" &&
              (hasParticipantRows ? (
                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-900 text-sm text-slate-400">
                        <th className="w-24 px-4 py-3 text-left">#</th>
                        <th className="px-4 py-3 text-left">Coser</th>
                        <th className="px-4 py-3 text-left">Character</th>
                        <th className="px-4 py-3 text-left">Series Title</th>
                      </tr>
                    </thead>

                    <tbody>
                      {participants.map((participant) => {
                        const info = getParticipantInfo(participant);

                        return (
                          <tr
                            key={participant.id}
                            className="border-t border-slate-800 text-sm hover:bg-slate-900/50"
                          >
                            <td className="px-4 py-3"></td>
                            <td className="px-4 py-3 font-medium">{info.coser}</td>
                            <td className="px-4 py-3">{info.character}</td>
                            <td className="px-4 py-3">{info.seriesTitle}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                renderEmptyState("No participants available.")
              ))}
          </>
        )}
      </div>
    </main>
  );
}