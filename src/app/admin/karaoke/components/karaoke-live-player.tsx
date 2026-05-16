// src/app/admin/karaoke/components/karaoke-live-player.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Music2 } from "lucide-react";

type CurrentItem = {
  id: string;
  singerName: string;
  youtubeVideoId: string;
  title: string | null;
};

type LiveData = {
  session: {
    id: string;
    title: string;
  } | null;
  currentItem: CurrentItem | null;
  isPlaying: boolean;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          videoId?: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  destroy: () => void;
};

export function KaraokeLivePlayer() {
  const playerRef = useRef<YTPlayer | null>(null);
  const currentVideoIdRef = useRef<string | null>(null);

  const [data, setData] = useState<LiveData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlayerReady, setIsPlayerReady] = useState(false);

  async function loadLiveData() {
    try {
      const response = await fetch("/api/admin/karaoke/live", {
        cache: "no-store",
      });

      const result = (await response.json()) as {
        success: boolean;
        data?: LiveData;
      };

      if (result.success && result.data) {
        setData(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadLiveData();

    const interval = setInterval(() => {
      void loadLiveData();
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (window.YT?.Player) {
      setIsPlayerReady(true);
      return;
    }

    window.onYouTubeIframeAPIReady = () => {
      setIsPlayerReady(true);
    };

    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (!isPlayerReady || !data?.currentItem) return;

    const videoId = data.currentItem.youtubeVideoId;

    if (!playerRef.current) {
      playerRef.current = new window.YT!.Player("karaoke-youtube-player", {
        videoId,
        playerVars: {
          autoplay: 1,
          controls: 1,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event) => {
            currentVideoIdRef.current = videoId;

            if (data.isPlaying) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          },
        },
      });

      return;
    }

    if (currentVideoIdRef.current !== videoId) {
      playerRef.current.loadVideoById(videoId);
      currentVideoIdRef.current = videoId;
      return;
    }

    if (data.isPlaying) {
      playerRef.current.playVideo();
    } else {
      playerRef.current.pauseVideo();
    }
  }, [data?.currentItem?.youtubeVideoId, data?.isPlaying, isPlayerReady]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="inline-flex items-center gap-3 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading karaoke live display...
        </div>
      </main>
    );
  }

  if (!data?.session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <Music2 className="mx-auto h-12 w-12 text-slate-600" />
          <h1 className="mt-4 text-2xl font-bold">No active session</h1>
          <p className="mt-2 text-slate-400">
            Activate a karaoke session first.
          </p>
        </div>
      </main>
    );
  }

  if (!data.currentItem) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="text-center">
          <Music2 className="mx-auto h-16 w-16 text-slate-600" />
          <h1 className="mt-6 text-4xl font-bold">{data.session.title}</h1>
          <p className="mt-3 text-xl text-slate-400">
            Waiting for next song...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 bg-black">
          <div id="karaoke-youtube-player" className="h-full min-h-screen w-full" />
        </div>

        <div className="fixed bottom-0 left-0 right-0 border-t border-white/10 bg-black/80 px-8 py-5 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-300">
            Now Singing
          </p>
          <div className="mt-2 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-5xl">
                {data.currentItem.singerName}
              </h1>
              <p className="mt-1 text-lg text-slate-300">
                {data.currentItem.title ?? data.currentItem.youtubeVideoId}
              </p>
            </div>

            <div className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
              {data.isPlaying ? "Playing" : "Paused"}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}