import { NextRequest, NextResponse } from 'next/server';
import {
  getAnimeByIdentifier,
  mapDbAnimeToPublicAnimeWithResolvedDescription,
} from '@/lib/anime-store';

type WatchSourcePayload = {
  provider: string;
  label: string;
  language: 'sub' | 'dub';
  type: 'embed' | 'stream' | 'download';
  url: string;
};

type WatchEpisodePayload = {
  number: number;
  title: string;
  airedAt?: string;
  isAired: boolean;
  thumbnail?: string;
  sources: WatchSourcePayload[];
  downloads: WatchSourcePayload[];
  externalIds?: {
    animePaheEpisodeSession?: string;
  };
};

type WatchPayload = {
  ok?: boolean;
  animeId: string;
  provider: 'anikoto' | 'animepahe' | null;
  fallbackUsed: boolean;
  episode: number;
  episodes: WatchEpisodePayload[];
  selectedEpisode: WatchEpisodePayload | null;
};

const WATCH_ROUTE_CACHE_TTL_MS = 10 * 60 * 1000;
const WATCH_ROUTE_EMPTY_CACHE_TTL_MS = 5 * 1000;

const watchPayloadCache = new Map<
  string,
  { expiresAt: number; payload: WatchPayload; status: number }
>();
const inFlightWatchPayloads = new Map<string, Promise<{ payload: WatchPayload; status: number }>>();

function hasPlayablePayload(payload: WatchPayload | null | undefined) {
  return Boolean(payload && payload.episodes.length > 0 && payload.selectedEpisode?.sources.length);
}

function buildWatchCacheKey(id: string, episode: number) {
  return `${id}:${episode}`;
}

function readCachedWatchPayload(id: string, episode: number) {
  const key = buildWatchCacheKey(id, episode);
  const cached = watchPayloadCache.get(key);
  if (!cached) {
    return null;
  }

  if (cached.expiresAt <= Date.now()) {
    watchPayloadCache.delete(key);
    return null;
  }

  return cached;
}

function writeCachedWatchPayload(id: string, episode: number, payload: WatchPayload, status: number) {
  const ttl = hasPlayablePayload(payload) ? WATCH_ROUTE_CACHE_TTL_MS : WATCH_ROUTE_EMPTY_CACHE_TTL_MS;
  watchPayloadCache.set(buildWatchCacheKey(id, episode), {
    expiresAt: Date.now() + ttl,
    payload,
    status,
  });
}

function normalizeTitle(value: string) {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

function readString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function readNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function extractList(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!payload || typeof payload !== 'object') {
    return [];
  }

  const record = payload as Record<string, unknown>;
  for (const candidate of [record.data, record.results, record.items, record.rows, record.episodes]) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

function inferLanguage(record: Record<string, unknown>) {
  if (typeof record.isDub === 'boolean') {
    return record.isDub ? 'dub' : 'sub';
  }

  const language = readString(record, ['audio', 'language', 'lang', 'type', 'label'])?.toLowerCase() ?? '';
  return language.includes('eng') || language.includes('dub') ? 'dub' : 'sub';
}

function collectStreamUrls(
  value: unknown,
  bucket: Array<{ url: string; language: 'sub' | 'dub'; label: string; type: 'embed' | 'stream' | 'download' }>
) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectStreamUrls(item, bucket);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as Record<string, unknown>;
  const resolution = readString(record, ['quality', 'resolution', 'label', 'title']);
  const label = resolution
    ? /^\d+$/.test(resolution)
      ? `${resolution}p`
      : resolution.toUpperCase()
    : 'HD';
  const language = inferLanguage(record);
  const candidateSources = [
    { url: readString(record, ['embed', 'embed_url']), type: 'embed' as const },
    { url: readString(record, ['url', 'file', 'src', 'link']), type: 'stream' as const },
  ];

  for (const candidate of candidateSources) {
    if (candidate.url && /^https?:\/\//i.test(candidate.url)) {
      bucket.push({
        url: candidate.url,
        language,
        label,
        type:
          candidate.type === 'embed'
            ? 'embed'
            : candidate.url.endsWith('.m3u8')
              ? 'stream'
              : 'download',
      });
    }
  }

  for (const nestedValue of Object.values(record)) {
    if (nestedValue && typeof nestedValue === 'object') {
      collectStreamUrls(nestedValue, bucket);
    }
  }
}

async function fetchProviderPayload(path: string, providerUrl: string) {
  const response = await fetch(new URL(path, providerUrl).toString(), {
    headers: { Accept: 'application/json, application/x-ndjson, text/plain' },
    cache: 'no-store',
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Provider request failed with status ${response.status}.`);
  }

  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function resolveAnimePaheDirect(
  anime: Awaited<ReturnType<typeof mapDbAnimeToPublicAnimeWithResolvedDescription>>,
  episode: number
) {
  const providerUrl = process.env.ANIVAULT_PROVIDER_API_URL?.trim();
  if (!providerUrl) {
    return null;
  }

  const searchPayload = await fetchProviderPayload(
    `/api/search?q=${encodeURIComponent(anime.title)}`,
    providerUrl
  );
  const searchItems = extractList(searchPayload).filter(
    (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
  );

  const normalizedTarget = normalizeTitle(anime.title);
  const animeMatch =
    searchItems.find((item) => normalizeTitle(readString(item, ['title', 'name', 'animeTitle']) ?? '') === normalizedTarget) ??
    searchItems.find((item) =>
      normalizeTitle(readString(item, ['title', 'name', 'animeTitle']) ?? '').includes(normalizedTarget)
    ) ??
    searchItems[0] ??
    null;

  if (!animeMatch) {
    console.warn(`[watch-route] direct search miss | title="${anime.title}" | episode=${episode}`);
    return null;
  }

  const animeSession = readString(animeMatch, ['session', 'animeSession', 'anime_session', 'id']);
  if (!animeSession) {
    console.warn(`[watch-route] direct session miss | title="${anime.title}" | episode=${episode}`);
    return null;
  }

  console.info(
    `[watch-route] direct search success | title="${anime.title}" | episode=${episode} | animeSession=${animeSession}`
  );

  const episodes: WatchEpisodePayload[] = [];
  const coverImage = anime.coverImage ?? undefined;
  const dbEpisodes = Array.isArray(anime.episodeList) ? anime.episodeList : [];

  for (let page = 1; page <= 8; page += 1) {
    const releasesPayload = await fetchProviderPayload(
      `/api/${encodeURIComponent(animeSession)}/releases?sort=episode_asc&page=${page}`,
      providerUrl
    );
    if (!releasesPayload) {
      break;
    }

    const releaseItems = extractList(releasesPayload).filter(
      (entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object'
    );

    for (const entry of releaseItems) {
      const number = readNumber(entry, ['episode', 'number']) ?? episodes.length + 1;
      const providerEpisodeSession = readString(entry, ['session', 'episodeSession', 'episode_session', 'id']);
      const dbEpisode = dbEpisodes.find((item) => item && typeof item === 'object' && 'number' in item && Number((item as { number?: unknown }).number) === number) as
        | {
            airedAt?: string;
            isAired?: boolean;
            thumbnail?: string;
            title?: string;
          }
        | undefined;

      episodes.push({
        number,
        title: dbEpisode?.title || `Episode ${number}`,
        airedAt: dbEpisode?.airedAt,
        isAired: dbEpisode?.isAired ?? true,
        thumbnail: dbEpisode?.thumbnail ?? coverImage,
        sources: [],
        downloads: [],
        externalIds: providerEpisodeSession
          ? { animePaheEpisodeSession: providerEpisodeSession }
          : undefined,
      });
    }

    const paginationInfo =
      releasesPayload && typeof releasesPayload === 'object' && !Array.isArray(releasesPayload)
        ? ((releasesPayload as Record<string, unknown>).paginationInfo as Record<string, unknown> | undefined)
        : undefined;
    const currentPage = paginationInfo ? readNumber(paginationInfo, ['currentPage', 'current_page', 'page']) : null;
    const lastPage = paginationInfo ? readNumber(paginationInfo, ['lastPage', 'last_page', 'totalPages', 'total_pages']) : null;
    if (!currentPage || !lastPage || currentPage >= lastPage) {
      break;
    }
  }

  const selectedEpisode = episodes.find((item) => item.number === episode) ?? null;
  const episodeSession = selectedEpisode?.externalIds?.animePaheEpisodeSession;
  if (!selectedEpisode || !episodeSession) {
    console.warn(
      `[watch-route] direct episode miss | title="${anime.title}" | episode=${episode} | animeSession=${animeSession} | providerEpisodes=${episodes.length}`
    );
    return null;
  }

  const playPayload = await fetchProviderPayload(
    `/api/play/${encodeURIComponent(animeSession)}?episodeId=${encodeURIComponent(episodeSession)}&downloads=false`,
    providerUrl
  );
  if (!playPayload) {
    console.warn(
      `[watch-route] direct play miss | title="${anime.title}" | episode=${episode} | animeSession=${animeSession} | episodeSession=${episodeSession}`
    );
    return null;
  }

  const collected: Array<{ url: string; language: 'sub' | 'dub'; label: string; type: 'embed' | 'stream' | 'download' }> = [];
  collectStreamUrls(playPayload, collected);
  const uniqueSources = collected.filter((source, index, array) => {
    const key = `${source.url}|${source.language}|${source.label}|${source.type}`;
    return array.findIndex((entry) => `${entry.url}|${entry.language}|${entry.label}|${entry.type}` === key) === index;
  });

  selectedEpisode.sources = uniqueSources
    .filter((source) => source.type !== 'download')
    .map((source) => ({
      provider: 'animepahe',
      label: source.label,
      language: source.language,
      type: source.type,
      url: source.url,
    }));
  selectedEpisode.downloads = uniqueSources
    .filter((source) => source.type === 'download')
    .map((source) => ({
      provider: 'animepahe',
      label: source.label,
      language: source.language,
      type: source.type,
      url: source.url,
    }));

  if (selectedEpisode.sources.length === 0) {
    console.warn(
      `[watch-route] direct sources miss | title="${anime.title}" | episode=${episode} | animeSession=${animeSession} | episodeSession=${episodeSession}`
    );
    return null;
  }

  console.info(
    `[watch-route] direct success | title="${anime.title}" | episode=${episode} | animeSession=${animeSession} | episodeSession=${episodeSession} | providerEpisodes=${episodes.length} | sources=${selectedEpisode.sources.length}`
  );

  return {
    animeId: anime.id,
    provider: 'animepahe',
    fallbackUsed: true,
    episode,
    episodes,
    selectedEpisode,
  } satisfies WatchPayload;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const apiUrl = process.env.ANIVAULT_API_URL?.trim();

    if (!apiUrl) {
      return NextResponse.json(
        { message: 'ANIVAULT_API_URL is required.' },
        { status: 500 }
      );
    }

    const episode = Math.max(
      1,
      Number.parseInt(request.nextUrl.searchParams.get('episode') ?? '1', 10) || 1
    );

    const localAnime = await getAnimeByIdentifier(id);
    if (!localAnime) {
      return NextResponse.json(
        { message: `Anime ${id} was not found.` },
        { status: 404 }
      );
    }

    const cachedPayload = readCachedWatchPayload(id, episode);
    if (cachedPayload) {
      return NextResponse.json(cachedPayload.payload, {
        status: cachedPayload.status,
        headers: { 'x-anivault-watch-cache': 'hit' },
      });
    }

    const cacheKey = buildWatchCacheKey(id, episode);
    const existingRequest = inFlightWatchPayloads.get(cacheKey);
    if (existingRequest) {
      const settled = await existingRequest;
      return NextResponse.json(settled.payload, {
        status: settled.status,
        headers: { 'x-anivault-watch-cache': 'shared' },
      });
    }

    const resolverPromise = (async () => {
      const anime = await mapDbAnimeToPublicAnimeWithResolvedDescription(localAnime);
      const url = new URL('/api/anime/watch/resolve', apiUrl);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          anime: {
            id: anime.id,
            malId: anime.malId ?? null,
            animePaheId: anime.animePaheId ?? null,
            animePaheSession: anime.animePaheSession ?? null,
            title: anime.title,
            englishTitle: anime.englishTitle ?? null,
            romajiTitle: anime.romajiTitle ?? null,
            nativeTitle: anime.nativeTitle ?? null,
            coverImage: anime.coverImage ?? null,
            episodeList: anime.episodeList ?? [],
          },
          episode,
        }),
        cache: 'no-store',
      });

      if (response.status !== 404) {
        const payload = (await response.json()) as WatchPayload;
        console.info(
          `[watch-route] upstream resolve | id="${id}" | episode=${episode} | status=${response.status} | provider=${payload?.provider ?? 'none'} | episodes=${Array.isArray(payload?.episodes) ? payload.episodes.length : 0} | sources=${Array.isArray(payload?.selectedEpisode?.sources) ? payload.selectedEpisode.sources.length : 0}`
        );
        if (hasPlayablePayload(payload)) {
          writeCachedWatchPayload(id, episode, payload, response.status);
          return { payload, status: response.status };
        }
      }

      const fallbackAnimeId = anime.title;
      const fallbackUrl = new URL('/api/anime/watch', apiUrl);
      fallbackUrl.searchParams.set('animeId', fallbackAnimeId);
      fallbackUrl.searchParams.set('episode', String(episode));

      const fallbackResponse = await fetch(fallbackUrl, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (fallbackResponse.status !== 404) {
        const fallbackPayload = (await fallbackResponse.json()) as WatchPayload;
        console.info(
          `[watch-route] fallback resolve | id="${id}" | title="${anime.title}" | episode=${episode} | status=${fallbackResponse.status} | provider=${fallbackPayload?.provider ?? 'none'} | episodes=${Array.isArray(fallbackPayload?.episodes) ? fallbackPayload.episodes.length : 0} | sources=${Array.isArray(fallbackPayload?.selectedEpisode?.sources) ? fallbackPayload.selectedEpisode.sources.length : 0}`
        );
        if (hasPlayablePayload(fallbackPayload)) {
          writeCachedWatchPayload(id, episode, fallbackPayload, fallbackResponse.status);
          return { payload: fallbackPayload, status: fallbackResponse.status };
        }
      }

      const directPayload = await resolveAnimePaheDirect(anime, episode).catch((error) => {
        console.error(
          `[watch-route] direct resolve error | title="${anime.title}" | episode=${episode} | message=${error instanceof Error ? error.message : String(error)}`
        );
        return null;
      });

      if (hasPlayablePayload(directPayload)) {
        writeCachedWatchPayload(id, episode, directPayload, 200);
        return { payload: directPayload, status: 200 };
      }

      console.warn(
        `[watch-route] empty resolve | id="${id}" | title="${anime.title}" | episode=${episode} | provider=none | episodes=0 | sources=0`
      );

      const emptyPayload = {
        ok: true,
        animeId: anime.id,
        provider: null,
        fallbackUsed: false,
        episode,
        episodes: [],
        selectedEpisode: null,
      } satisfies WatchPayload;

      writeCachedWatchPayload(id, episode, emptyPayload, 200);
      return { payload: emptyPayload, status: 200 };
    })();

    inFlightWatchPayloads.set(cacheKey, resolverPromise);
    try {
      const settled = await resolverPromise;
      return NextResponse.json(settled.payload, {
        status: settled.status,
        headers: { 'x-anivault-watch-cache': 'miss' },
      });
    } finally {
      inFlightWatchPayloads.delete(cacheKey);
    }
  } catch (error) {
    console.error(
      `[watch-route] resolve error | message=${error instanceof Error ? error.message : 'Unable to resolve watch payload.'}`
    );
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Unable to resolve watch payload.',
      },
      { status: 500 }
    );
  }
}
