// src/components/HlsPlayer.tsx  (or wherever your player component lives)
//
// Drop-in HLS player using hls.js.
// Install: npm install hls.js
// Install types: npm install -D @types/hls.js
//
// Usage:
//   <HlsPlayer src="https://..." className="w-full aspect-video" />

"use client";

import { useEffect, useRef, useState } from "react";

interface HlsPlayerProps {
  /** The m3u8 URL — will be routed through stream-proxy automatically */
  src: string | null | undefined;
  className?: string;
  autoPlay?: boolean;
  onError?: (msg: string) => void;
}

/**
 * Routes any m3u8 URL through /api/anime/stream-proxy so the server
 * injects the required Referer: kwik.cx header for the owocdn.top CDN.
 */
function proxyUrl(url: string): string {
  if (!url) return url;
  // Already going through proxy
  if (url.includes("/api/anime/stream-proxy")) return url;
  return `/api/anime/stream-proxy?url=${encodeURIComponent(url)}`;
}

export default function HlsPlayer({
  src,
  className = "",
  autoPlay = false,
  onError,
}: HlsPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<import("hls.js").default | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!src) return;
    const video = videoRef.current;
    if (!video) return;

    const proxied = proxyUrl(src);
    setError(null);

    // Destroy previous hls instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    async function initHls() {
      const Hls = (await import("hls.js")).default;

      if (Hls.isSupported()) {
        const hls = new Hls({
          // The proxy handles segment fetching so hls.js gets plain responses
          xhrSetup: (xhr: XMLHttpRequest) => {
            // No extra headers needed — proxy already adds Referer
            xhr.withCredentials = false;
          },
        });

        hls.loadSource(proxied);
        hls.attachMedia(video!);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (autoPlay) video!.play().catch(() => {});
        });

        hls.on(Hls.Events.ERROR, (_event: unknown, data: import("hls.js").ErrorData) => {
          if (data.fatal) {
            const msg = `HLS error: ${data.type} — ${data.details}`;
            setError(msg);
            onError?.(msg);
          }
        });

        hlsRef.current = hls;
      } else if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        // Safari native HLS — still route through proxy for the Referer header
        video!.src = proxied;
        if (autoPlay) video!.play().catch(() => {});
      } else {
        const msg = "HLS is not supported in this browser.";
        setError(msg);
        onError?.(msg);
      }
    }

    initHls();

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
    };
  }, [src, autoPlay, onError]);

  if (!src) return null;

  return (
    <div className={`relative bg-black ${className}`}>
      {error && (
        <div className="absolute inset-0 flex items-center justify-center text-white text-sm p-4 text-center">
          <div>
            <p className="font-semibold">Stream unavailable</p>
            <p className="text-gray-400 text-xs mt-1">{error}</p>
          </div>
        </div>
      )}
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        playsInline
        style={{ display: error ? "none" : "block" }}
      />
    </div>
  );
}
