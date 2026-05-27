// src/app/api/anime/stream-proxy/route.ts
//
// Proxies CDN .m3u8 and .ts segment URLs, injecting the required
// Referer: kwik.cx header that the owocdn.top CDN enforces.
// The frontend player calls this proxy for ALL m3u8/segment requests
// so the browser never touches the CDN directly.

import { type NextRequest, NextResponse } from "next/server";

const ALLOWED_CDN_PATTERNS = [
  /\.owocdn\.top$/,
  /\.squeezing\.space$/,
  /\.p-animepahe\.com$/,
  /animepahe\.(ru|com|org|pw|si)$/,
];

const KWIK_HOSTS = new Set(["kwik.cx", "kwik.si", "kwik.link"]);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawUrl = searchParams.get("url");

  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const hostname = targetUrl.hostname.toLowerCase();

  // kwik URLs should never reach here if streaming.ts is fixed correctly.
  // If they do, return a clear error.
  if (KWIK_HOSTS.has(hostname)) {
    return NextResponse.json(
      { error: "kwik URLs cannot be proxied server-side. Check anivault-api streaming.ts fix." },
      { status: 502 }
    );
  }

  const isAllowed = ALLOWED_CDN_PATTERNS.some((p) => p.test(hostname));
  if (!isAllowed) {
    return NextResponse.json({ error: `Host ${hostname} not allowed` }, { status: 403 });
  }

  try {
    const upstream = await fetch(rawUrl, {
      headers: {
        // owocdn.top CDN requires Referer from kwik.cx
        "Referer": "https://kwik.cx/",
        "Origin": "https://kwik.cx",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!upstream.ok) {
      console.error(`[stream-proxy] CDN ${upstream.status} for ${rawUrl}`);
      return NextResponse.json({ error: `CDN returned ${upstream.status}` }, { status: upstream.status });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    // For .m3u8 playlist files, rewrite segment URLs to go through this proxy
    // so the browser never makes direct CDN requests (which would miss the Referer header).
    if (rawUrl.endsWith(".m3u8") || contentType.includes("mpegurl") || contentType.includes("x-mpegURL")) {
      const text = new TextDecoder().decode(body);
      const baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf("/") + 1);

      const rewritten = text.split("\n").map((line) => {
        const trimmed = line.trim();
        // Rewrite .m3u8 references (sub-playlists) and .ts segments
        if (trimmed && !trimmed.startsWith("#")) {
          let segmentUrl: string;
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            segmentUrl = trimmed;
          } else {
            segmentUrl = baseUrl + trimmed;
          }
          return `/api/anime/stream-proxy?url=${encodeURIComponent(segmentUrl)}`;
        }
        return line;
      }).join("\n");

      return new NextResponse(rewritten, {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts video segments and other assets, pass through directly
    return new NextResponse(body, {
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[stream-proxy] error: ${msg}`, { url: rawUrl });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}