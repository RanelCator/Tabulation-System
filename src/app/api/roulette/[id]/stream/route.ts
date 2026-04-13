import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STREAM_DURATION_MS = 55_000;
const POLL_INTERVAL_MS = 5_000;

export async function GET(req: NextRequest, context: RouteContext) {
  const { id: sessionId } = await context.params;

  const encoder = new TextEncoder();
  let lastVersion = 0;
  let isClosed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let interval: ReturnType<typeof setInterval> | null = null;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;

      const safeEnqueue = (chunk: string) => {
        if (isClosed) return false;

        try {
          controller.enqueue(encoder.encode(chunk));
          return true;
        } catch {
          isClosed = true;
          return false;
        }
      };

      const send = (event: string, data: unknown) => {
        if (isClosed) return;

        const okEvent = safeEnqueue(`event: ${event}\n`);
        if (!okEvent) return;

        safeEnqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      const cleanup = () => {
        if (isClosed) return;
        isClosed = true;

        if (interval) {
          clearInterval(interval);
          interval = null;
        }

        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      try {
        const initialVersionRaw = await redis.get(`roulette:${sessionId}:version`);
        lastVersion =
          typeof initialVersionRaw === "number"
            ? initialVersionRaw
            : Number(initialVersionRaw ?? 0);

        if (!Number.isFinite(lastVersion)) {
          lastVersion = 0;
        }
      } catch (error) {
        console.error("Initial SSE version read failed:", error);
        lastVersion = 0;
      }

      send("connected", { ok: true, sessionId, version: lastVersion });

      interval = setInterval(async () => {
        if (isClosed) return;

        try {
          const versionRaw = await redis.get(`roulette:${sessionId}:version`);
          if (isClosed) return;

          const currentVersion =
            typeof versionRaw === "number"
              ? versionRaw
              : Number(versionRaw ?? 0);

          if (!Number.isFinite(currentVersion) || currentVersion <= lastVersion) {
            return;
          }

          const latest = await redis.get(`roulette:${sessionId}:latest`);
          if (isClosed) return;

          lastVersion = currentVersion;

          if (!latest) {
            return;
          }

          send("roulette", latest);
        } catch (error) {
          if (isClosed) return;
          console.error("SSE error:", error);
        }
      }, POLL_INTERVAL_MS);

      timeoutId = setTimeout(() => {
        cleanup();
      }, STREAM_DURATION_MS);

      req.signal.addEventListener("abort", cleanup);
    },

    cancel() {
      isClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}