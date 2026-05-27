import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Stream Proxy — resolves embed URLs (kwik.cx etc.) to direct .m3u8 sources
//
// kwik.cx and similar hosts set X-Frame-Options: DENY so direct <iframe>
// embedding is always blocked by browsers.  This route fetches the embed
// page server-side (where those headers don't apply), extracts the real
// stream URL from the page JS, and returns it as JSON so the client-side
// HLS player can play it directly.
// ---------------------------------------------------------------------------

const PROXY_CACHE_TTL_MS = 4 * 60 * 1000; // 4 min (streams expire ~5 min)

const proxyCache = new Map<string, { url: string; expiresAt: number }>();

function getCached(embedUrl: string) {
  const entry = proxyCache.get(embedUrl);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    proxyCache.delete(embedUrl);
    return null;
  }
  return entry.url;
}

function setCached(embedUrl: string, streamUrl: string) {
  // Evict oldest when cache exceeds 200 entries
  if (proxyCache.size >= 200) {
    const oldest = [...proxyCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
    if (oldest) proxyCache.delete(oldest[0]);
  }
  proxyCache.set(embedUrl, { url: streamUrl, expiresAt: Date.now() + PROXY_CACHE_TTL_MS });
}

/**
 * Extract the .m3u8 URL from a kwik.cx embed page.
 *
 * kwik.cx obfuscates the stream URL inside a packed JS eval(). The pattern
 * we look for in the raw HTML / deobfuscated payload:
 *   source='https://...uwu.m3u8'
 *   file:"https://...uwu.m3u8"
 *   "hls":"https://...m3u8"
 *   https://...uwu.m3u8   (bare URL in a string literal)
 */
function extractM3u8(html: string): string | null {
  // Direct patterns first (fastest)
  const patterns = [
    /source\s*=\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /file\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /['"]hls['"]\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /src\s*:\s*['"]([^'"]+\.m3u8[^'"]*)['"]/i,
    /(https?:\/\/[^\s'"<>]+\.m3u8[^\s'"<>]*)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return match[1];
  }

  // kwik.cx uses a p,a,c,k,e,d eval obfuscator — try to unpack it
  const evalMatch = html.match(/eval\s*\(\s*function\s*\(p,a,c,k,e,[sd]\)[\s\S]+?(?=<\/script>)/i);
  if (evalMatch) {
    const unpacked = unpackEval(evalMatch[0]);
    if (unpacked) {
      for (const pattern of patterns) {
        const match = unpacked.match(pattern);
        if (match?.[1]) return match[1];
      }
    }
  }

  return null;
}

/**
 * Minimal p,a,c,k,e,d unpacker.
 * Extracts the string args and reassembles the original JS.
 */
function unpackEval(packed: string): string | null {
  try {
    // Pull out the string payload — it's always the first string arg after function(p,a,c,k,e,...)
    const payloadMatch = packed.match(
      /\}\s*\(\s*'([\s\S]+?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'([\s\S]+?)'\s*\.split/
    );
    if (!payloadMatch) return null;

    const [, p, , , wordsRaw] = payloadMatch;
    const radix = Number.parseInt(payloadMatch[2], 10);
    const count = Number.parseInt(payloadMatch[3], 10);
    const words = wordsRaw.split('|');

    if (words.length !== count) return null;

    // Decode base-N word lookup table
    const decode = (n: number) => {
      if (n < radix) return words[n] || n.toString(radix);
      return decode(Math.floor(n / radix)) + (words[n % radix] || (n % radix).toString(radix));
    };

    return p.replace(/\b(\w+)\b/g, (match) => {
      const num = Number.parseInt(match, 36);
      if (Number.isNaN(num)) return match;
      return decode(num) || match;
    });
  } catch {
    return null;
  }
}

async function resolveEmbedUrl(embedUrl: string): Promise<string | null> {
  const cached = getCached(embedUrl);
  if (cached) return cached;

  // Determine the Referer — kwik.cx requires referer from animePahe domains
  const referer = embedUrl.includes('kwik') ? 'https://animepahe.ru/' : new URL(embedUrl).origin + '/';

  const response = await fetch(embedUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      Referer: referer,
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`Embed fetch failed: ${response.status}`);
  }

  const html = await response.text();
  const m3u8Url = extractM3u8(html);
  if (!m3u8Url) return null;

  setCached(embedUrl, m3u8Url);
  return m3u8Url;
}

export async function GET(request: NextRequest) {
  try {
    const embedUrl = request.nextUrl.searchParams.get('url');
    if (!embedUrl || !/^https?:\/\//i.test(embedUrl)) {
      return NextResponse.json({ message: 'url param is required and must be an absolute URL.' }, { status: 400 });
    }

    const streamUrl = await resolveEmbedUrl(embedUrl);
    if (!streamUrl) {
      return NextResponse.json({ message: 'Could not extract stream URL from embed.' }, { status: 404 });
    }

    return NextResponse.json(
      { url: streamUrl },
      {
        headers: {
          'Cache-Control': 'private, max-age=240',
        },
      }
    );
  } catch (error) {
    console.error('[stream-proxy] error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to resolve stream URL.' },
      { status: 500 }
    );
  }
}