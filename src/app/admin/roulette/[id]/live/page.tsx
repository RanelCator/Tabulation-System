"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Shuffle, Trophy, X } from "lucide-react";
import { useParams } from "next/navigation";

type WheelSegment = {
  participantId: string;
  label: string;
  start: number;
  end: number;
  mid: number;
  color: string;
};

type SpinEvent = {
  type: "spin_result";
  sessionId: string;
  resultId: string;
  winner: {
    participantId: string;
    participantName: string;
    drawMode?: "random" | "predetermined";
  };
  wheelParticipants: Array<{
    id: string;
    name: string;
    orderNo: number;
  }>;
  createdAt: string;
};

type SpinResponse = {
  success: boolean;
  message?: string;
  data?: {
    result: {
      id: string;
      createdAt?: string;
    };
    winner: {
      participantId: string;
      participantName: string;
      drawMode: "random" | "predetermined";
    };
    wheelParticipants: Array<{
      id: string;
      name: string;
      orderNo: number;
    }>;
  };
};

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function describeArcSlice(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(cx, cy, outerRadius, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerRadius, startAngle);
  const startInner = polarToCartesian(cx, cy, innerRadius, startAngle);
  const endInner = polarToCartesian(cx, cy, innerRadius, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function pointOnCircle(
  cx: number,
  cy: number,
  radius: number,
  angleDeg: number,
) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function generateWheel(participants: Array<{ id: string; name: string }>) {
  const colors = ["#ef4444", "#3b82f6", "#22c55e", "#facc15"];
  const total = participants.length;

  if (total === 0) {
    return { segments: [] as WheelSegment[] };
  }

  const anglePerSegment = 360 / total;
  let currentAngle = 0;

  const segments: WheelSegment[] = participants.map((participant, index) => {
    const start = currentAngle;
    const end = currentAngle + anglePerSegment;
    const mid = start + anglePerSegment / 2;

    currentAngle = end;

    return {
      participantId: participant.id,
      label: participant.name,
      start,
      end,
      mid,
      color: colors[index % colors.length],
    };
  });

  return { segments };
}

export default function LivePage() {
  const { id } = useParams<{ id: string }>();

  const [segments, setSegments] = useState<WheelSegment[]>([]);
  const [rotation, setRotation] = useState(0);
  const [winnerName, setWinnerName] = useState("");
  const [winnerId, setWinnerId] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const rotationRef = useRef(0);
  const animatingRef = useRef(false);
  const spinAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    rotationRef.current = rotation;
  }, [rotation]);

  useEffect(() => {
    animatingRef.current = isAnimating;
  }, [isAnimating]);

  useEffect(() => {
    const audio = new Audio("/sounds/spin.mp3");
    audio.preload = "auto";
    spinAudioRef.current = audio;

    return () => {
      spinAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!showConfetti) return;

    const timeout = window.setTimeout(() => {
      setShowConfetti(false);
    }, 4500);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [showConfetti]);

  async function handleSpinEvent(event: SpinEvent) {
    if (animatingRef.current) return;
    if (!event.wheelParticipants?.length) return;

    const wheel = generateWheel(
      event.wheelParticipants.map((participant) => ({
        id: participant.id,
        name: participant.name,
      })),
    );

    setSegments(wheel.segments);

    const winnerIndex = event.wheelParticipants.findIndex(
      (participant) => participant.id === event.winner.participantId,
    );

    if (winnerIndex < 0) return;

    const winnerSegment = wheel.segments[winnerIndex];
    if (!winnerSegment) return;

    setIsAnimating(true);
    setWinnerName("");
    setWinnerId("");
    setShowModal(false);
    setShowConfetti(false);

    try {
      if (spinAudioRef.current) {
        spinAudioRef.current.currentTime = 0;
        void spinAudioRef.current.play().catch(() => {
          // ignore autoplay restriction
        });
      }

    const baseRotation = rotationRef.current;
    const normalized = ((baseRotation % 360) + 360) % 360;

    const POINTER_ANGLE = 90;
    const target = (POINTER_ANGLE - winnerSegment.mid + 360) % 360;
    const delta = (target - normalized + 360) % 360;

    const fullSpins = 360 * 6;
    const finalRotation = baseRotation + fullSpins + delta;

      const durationMs = 4200;
      const startTime = performance.now();

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = 1 - Math.pow(1 - progress, 3);

        const currentRotation =
          baseRotation + (finalRotation - baseRotation) * eased;

        setRotation(currentRotation);

        if (progress < 1) {
          window.requestAnimationFrame(animate);
          return;
        }

        setWinnerName(event.winner.participantName);
        setWinnerId(event.winner.participantId);
        setShowModal(true);
        setShowConfetti(true);
        setIsAnimating(false);
      };

      window.requestAnimationFrame(animate);
    } catch (error) {
      console.error("Spin animation failed:", error);
      setIsAnimating(false);
    }
  }

  async function handleSpin() {
    if (!id || isSpinning || animatingRef.current) return;

    try {
      setIsSpinning(true);

      const response = await fetch(`/api/roulette/${id}/spin`, {
        method: "POST",
      });

      const result = (await response.json()) as SpinResponse;

      if (!response.ok || !result.success || !result.data?.winner) {
        throw new Error(result.message ?? "Failed to spin roulette.");
      }

      const event: SpinEvent = {
        type: "spin_result",
        sessionId: id,
        resultId: result.data.result.id,
        winner: {
          participantId: result.data.winner.participantId,
          participantName: result.data.winner.participantName,
          drawMode: result.data.winner.drawMode,
        },
        wheelParticipants: result.data.wheelParticipants,
        createdAt: result.data.result.createdAt ?? new Date().toISOString(),
      };

      await handleSpinEvent(event);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Failed to spin roulette.");
    } finally {
      setIsSpinning(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">
      <div className="absolute right-6 top-6 z-20">
        <button
          type="button"
          onClick={() => void handleSpin()}
          disabled={isSpinning || isAnimating}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSpinning || isAnimating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Spinning...
            </>
          ) : (
            <>
              <Shuffle className="h-4 w-4" />
              Spin
            </>
          )}
        </button>
      </div>

      <div className="relative flex flex-col items-center">
        <div className="mb-6 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-slate-400">
            Live Roulette Display
          </p>
        </div>

        <div className="relative">
          <div
            className="relative h-[680px] w-[680px] rounded-full"
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <svg viewBox="0 0 680 680" className="h-full w-full">
              {segments.length > 0 ? (
                segments.map((segment) => {
                  const point = pointOnCircle(340, 340, 240, segment.mid);

                  return (
                    <g key={segment.participantId}>
                      <path
                        d={describeArcSlice(
                          340,
                          340,
                          320,
                          70,
                          segment.start,
                          segment.end,
                        )}
                        fill={segment.color}
                        className={
                          segment.participantId === winnerId
                            ? "stroke-yellow-300 stroke-[4] drop-shadow-[0_0_20px_rgba(255,255,0,0.8)]"
                            : ""
                        }
                      />
                      <text
                        x={point.x}
                        y={point.y}
                        textAnchor="middle"
                        fill="white"
                        transform={`rotate(${segment.mid - 90} ${point.x} ${point.y})`}
                      >
                        {segment.label}
                      </text>
                    </g>
                  );
                })
              ) : (
                <g>
                  <circle cx="340" cy="340" r="320" fill="#111827" />
                  <text
                    x="340"
                    y="340"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#94a3b8"
                    fontSize="28"
                    fontWeight="600"
                  >
                    Ready to spin
                  </text>
                </g>
              )}
            </svg>
          </div>

          <div className="absolute right-[-30px] top-1/2 -translate-y-1/2">
            <div className="h-0 w-0 border-y-[30px] border-y-transparent border-r-[50px] border-r-white" />
          </div>
        </div>
      </div>

      {showModal ? (
        <div className="fixed inset-0 flex items-center justify-center bg-black/80">
          <div className="rounded-2xl bg-slate-900 p-10 text-center shadow-2xl">
            <div className="mb-4 flex justify-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
                <Trophy className="h-8 w-8 text-amber-300" />
              </div>
            </div>

            <h2 className="text-sm uppercase tracking-[0.3em] text-yellow-400">
              Winner
            </h2>

            <h1 className="mt-4 text-4xl font-bold">{winnerName}</h1>

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-medium transition hover:bg-blue-700"
            >
              <X className="h-4 w-4" />
              Close
            </button>
          </div>
        </div>
      ) : null}

      {showConfetti ? (
        <div className="pointer-events-none fixed inset-0 animate-pulse bg-[radial-gradient(circle,rgba(255,255,0,0.12),transparent)]" />
      ) : null}
    </main>
  );
}