"use client";

import { useEffect, useRef } from "react";
import { shouldCorrectDrift } from "@/lib/sync/events";
import { SyncEvent } from "@/lib/types";

type YTPlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  destroy: () => void;
};

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          videoId: string;
          events: {
            onReady: () => void;
            onStateChange: (e: { data: number }) => void;
          };
          playerVars?: Record<string, number>
        }
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

export default function YouTubeSyncPlayer({
  roomId,
  videoId,
  isHost,
  currentUserId,
  latestEvent,
  sendSyncEvent
}: {
  roomId: string;
  videoId: string;
  isHost: boolean;
  currentUserId: string;
  latestEvent: SyncEvent | null;
  sendSyncEvent: (event: SyncEvent) => Promise<void>;
}) {
  const playerRef = useRef<YTPlayer | null>(null);
  const ignoreNextRef = useRef(false);
  const seekDebounceRef = useRef<number | null>(null);

  useEffect(() => {
    const scriptId = "youtube-iframe-api";

    const initPlayer = () => {
      if (!window.YT || playerRef.current) return;
      playerRef.current = new window.YT.Player("yt-player", {
        videoId,
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            if (isHost) {
              void sendSyncEvent({
                type: "SET_SOURCE",
                senderId: currentUserId,
                payload: { roomId, platform: "youtube", ts: Date.now(), videoId }
              });
            }
          },
          onStateChange: (e) => {
            if (!isHost || ignoreNextRef.current || !playerRef.current) return;
            const currentTime = playerRef.current.getCurrentTime();
            if (e.data === 1) {
              void sendSyncEvent({
                type: "PLAY",
                senderId: currentUserId,
                payload: { roomId, platform: "youtube", videoTime: currentTime, ts: Date.now(), videoId }
              });
            }
            if (e.data === 2) {
              void sendSyncEvent({
                type: "PAUSE",
                senderId: currentUserId,
                payload: { roomId, platform: "youtube", videoTime: currentTime, ts: Date.now(), videoId }
              });
            }
          }
        }
      });
    };

    const existing = document.getElementById(scriptId);
    if (!existing) {
      const script = document.createElement("script");
      script.id = scriptId;
      script.src = "https://www.youtube.com/iframe_api";
      document.body.appendChild(script);
    }

    window.onYouTubeIframeAPIReady = initPlayer;
    if (window.YT) initPlayer();

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [currentUserId, isHost, roomId, sendSyncEvent, videoId]);

  useEffect(() => {
    if (!isHost || !playerRef.current) return;

    const interval = setInterval(() => {
      if (!playerRef.current) return;
      void sendSyncEvent({
        type: "PING",
        senderId: currentUserId,
        payload: {
          roomId,
          platform: "youtube",
          videoId,
          ts: Date.now(),
          videoTime: playerRef.current.getCurrentTime()
        }
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentUserId, isHost, roomId, sendSyncEvent, videoId]);

  useEffect(() => {
    if (!playerRef.current || isHost || !latestEvent) return;
    if (latestEvent.payload.platform !== "youtube") return;
    if (latestEvent.senderId === currentUserId) return;

    const player = playerRef.current;
    const incomingTime = latestEvent.payload.videoTime ?? 0;

    ignoreNextRef.current = true;
    setTimeout(() => {
      ignoreNextRef.current = false;
    }, 150);

    switch (latestEvent.type) {
      case "PLAY": {
        const local = player.getCurrentTime();
        if (shouldCorrectDrift(incomingTime, local)) player.seekTo(incomingTime, true);
        player.playVideo();
        break;
      }
      case "PAUSE": {
        const local = player.getCurrentTime();
        if (shouldCorrectDrift(incomingTime, local)) player.seekTo(incomingTime, true);
        player.pauseVideo();
        break;
      }
      case "SEEK": {
        player.seekTo(incomingTime, true);
        break;
      }
      case "SET_SOURCE":
      case "PING": {
        const local = player.getCurrentTime();
        if (shouldCorrectDrift(incomingTime, local)) player.seekTo(incomingTime, true);
        break;
      }
    }
  }, [currentUserId, isHost, latestEvent]);

  useEffect(() => {
    if (!isHost || !playerRef.current) return;

    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const now = playerRef.current.getCurrentTime();

      if (seekDebounceRef.current) clearTimeout(seekDebounceRef.current);
      seekDebounceRef.current = window.setTimeout(() => {
        void sendSyncEvent({
          type: "SEEK",
          senderId: currentUserId,
          payload: { roomId, platform: "youtube", videoTime: now, ts: Date.now(), videoId }
        });
      }, 250);
    }, 5000);

    return () => clearInterval(interval);
  }, [currentUserId, isHost, roomId, sendSyncEvent, videoId]);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl border border-slate-200 bg-black">
      <div id="yt-player" className="h-full w-full" />
    </div>
  );
}