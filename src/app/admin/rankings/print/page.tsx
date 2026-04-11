import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getEventRankings } from "@/lib/rankings";
import PrintButton from "@/components/print-button";

type PrintPageProps = {
  searchParams: Promise<{
    eventId?: string;
  }>;
};

export default async function RankingsPrintPage({ searchParams }: PrintPageProps) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  if (session.role !== "admin") {
    redirect("/judge");
  }

  const params = await searchParams;
  const eventId = params.eventId;

  if (!eventId) {
    return <div className="p-6">Missing eventId</div>;
  }

  const result = await getEventRankings(eventId);

  if (!result) {
    return <div className="p-6">Event not found</div>;
  }

  return (
    <main className="print-page">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 12mm;
        }

        html, body {
          background: white;
          color: black;
          font-family: Arial, Helvetica, sans-serif;
        }

        .print-page {
          width: 100%;
          max-width: 210mm;
          margin: 0 auto;
          padding: 0;
        }

        .print-title {
          text-align: center;
          margin-bottom: 16px;
        }

        .print-title h1 {
          font-size: 20px;
          margin: 0;
        }

        .print-title p {
          margin: 4px 0 0;
          font-size: 12px;
        }

        .ranking-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 12px;
        }

        .ranking-table th,
        .ranking-table td {
          border: 1px solid #000;
          padding: 6px 8px;
          font-size: 12px;
        }

        .ranking-table th {
          background: #f3f4f6;
        }

        .signature-section {
          margin-top: 28px;
          page-break-inside: avoid;
        }

        .signature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 28px 32px;
          margin-top: 16px;
        }

        .signature-box {
          text-align: center;
          min-height: 80px;
        }

        .signature-line {
          border-top: 1px solid #000;
          margin-top: 48px;
          padding-top: 6px;
          font-size: 12px;
          font-weight: 600;
        }

        .no-print {
          margin-bottom: 16px;
        }

        @media print {
          .no-print {
            display: none;
          }
        }
      `}</style>

      <div className="no-print">
       <PrintButton />
      </div>

      <div className="print-title">
        <h1>{result.event.name}</h1>
        <p>Final Ranking Sheet</p>
      </div>

      <table className="ranking-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>No.</th>
            <th>Participant</th>
            <th>Raw Score</th>
            <th>Deduction</th>
            <th>Final Score</th>
          </tr>
        </thead>
        <tbody>
          {result.rankings.map((item) => (
            <tr key={item.participantId}>
              <td>{item.rank}</td>
              <td>{item.participantNumber}</td>
              <td>{item.participantName}</td>
              <td>{item.rawScore.toFixed(2)}</td>
              <td>{item.deduction.toFixed(2)}</td>
              <td>{item.finalScore.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <section className="signature-section">
        <h2 style={{ fontSize: "14px", margin: 0 }}>Judges&apos; Signatures</h2>

        <div className="signature-grid">
          {result.judges.map((judge) => (
            <div key={judge.id} className="signature-box">
              <div className="signature-line">{judge.displayName}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}