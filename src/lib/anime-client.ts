import type { Anime, AnimeGridItem, SearchAnimeItem, TrendingItem, ScheduleDayItem } from '@/lib/anime-data';

export interface ScheduleEntry extends ScheduleDayItem {
  airingAt: number;
}

export interface HomePagePayload {
  featuredAnime: Anime[];
  latestEpisodes: AnimeGridItem[];
  newOnSite: Anime[];
  upcomingAnime: Anime[];
  trendingAnime: TrendingItem[];
}

export interface SearchPayload {
  items: SearchAnimeItem[];
  total: number;
  limit?: number;
  offset?: number;
  facets?: {
    genres: string[];
    years: string[];
    seasons: string[];
    formats: string[];
    statuses: string[];
    studios: string[];
  };
}

export interface SearchFacetsPayload {
  facets: SearchFacets;
}

export interface SearchFacets {
  genres: string[];
  years: string[];
  seasons: string[];
  formats: string[];
  statuses: string[];
  studios: string[];
}

export interface SearchRequest {
  query?: string;
  genre?: string | null;
  year?: string | null;
  season?: string | null;
  format?: string | null;
  status?: string | null;
  tag?: string | null;
  sourceMaterial?: string | null;
  studio?: string | null;
  limit?: number;
  offset?: number;
  perPage?: number;
  quick?: boolean;
  includeFacets?: boolean;
}

export function buildAnimeLookupId(anime: Pick<Anime, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>) {
  const source =
    anime.title?.trim() ||
    anime.englishTitle?.trim() ||
    anime.romajiTitle?.trim() ||
    anime.nativeTitle?.trim() ||
    '';

  const slug = source
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || source;
}

export interface WatchSourcePayload {
  provider: string;
  label: string;
  language: 'sub' | 'dub';
  type: 'embed' | 'stream' | 'download';
  url: string;
}

export interface WatchEpisodePayload {
  number: number;
  title: string;
  airedAt?: string;
  isAired: boolean;
  thumbnail?: string;
  sources: WatchSourcePayload[];
  downloads: WatchSourcePayload[];
  providerEpisodeId?: string;
  externalIds?: {
    animePaheEpisodeSession?: string;
  };
}

export interface WatchPagePayload {
  ok: boolean;
  animeId: string;
  provider: 'anikoto' | 'animepahe' | null;
  fallbackUsed: boolean;
  episode: number;
  episodes: WatchEpisodePayload[];
  selectedEpisode: WatchEpisodePayload | null;
}

const WATCH_PAYLOAD_CACHE_TTL_MS = 10 * 60 * 1000;
const WATCH_PAYLOAD_CACHE_PREFIX = 'anivault:watch-payload:v2:';

function hasPlayableWatchPayload(payload: WatchPagePayload | null | undefined) {
  return Boolean(payload && payload.episodes.length > 0 && payload.selectedEpisode?.sources.length);
}

async function getJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

function buildWatchPayloadCacheKey(watchId: string, episode: number) {
  return `${WATCH_PAYLOAD_CACHE_PREFIX}${watchId}:${episode}`;
}

function readCachedWatchPayload(watchId: string, episode: number) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.sessionStorage.getItem(buildWatchPayloadCacheKey(watchId, episode));
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as {
      expiresAt?: number;
      value?: WatchPagePayload;
    };

    if (!parsed.value || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      window.sessionStorage.removeItem(buildWatchPayloadCacheKey(watchId, episode));
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

function writeCachedWatchPayload(watchId: string, episode: number, payload: WatchPagePayload) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!hasPlayableWatchPayload(payload)) {
    return;
  }

  try {
    window.sessionStorage.setItem(
      buildWatchPayloadCacheKey(watchId, episode),
      JSON.stringify({
        expiresAt: Date.now() + WATCH_PAYLOAD_CACHE_TTL_MS,
        value: payload,
      })
    );
  } catch {
    // Ignore cache write failures and continue with live data.
  }
}

export async function fetchHomePageData() {
  return getJson<HomePagePayload>('/api/anime/home', {
    next: { revalidate: 60 }, // Use Next.js data cache instead of fetch cache
  });
}

export async function fetchAnimeById(id: string) {
  return getJson<Anime>(`/api/anime/${id}`, {
    cache: 'no-store',
  });
}

export async function fetchAnimeWatchPayload(anime: Anime, episode: number) {
  const watchId = buildAnimeLookupId(anime);
  const normalizedEpisode = Math.max(1, Math.floor(episode) || 1);
  const cached = readCachedWatchPayload(watchId, normalizedEpisode);
  if (cached) {
    return cached;
  }

  const params = new URLSearchParams({ episode: String(normalizedEpisode) });

  const payload = await getJson<WatchPagePayload>(`/api/anime/${encodeURIComponent(watchId)}/watch?${params.toString()}`, {
    cache: 'no-store',
  });
  writeCachedWatchPayload(watchId, normalizedEpisode, payload);
  return payload;
}

export function hydrateAnimeWithWatchPayload(anime: Anime, payload: WatchPagePayload): Anime {
  return {
    ...anime,
    episodes: payload.episodes.length || anime.episodes,
    totalEpisodes: payload.episodes.length || anime.totalEpisodes,
    episodeList: payload.episodes.map((episode) => ({
      number: episode.number,
      title: episode.title,
      airedAt: episode.airedAt,
      isAired: episode.isAired,
      thumbnail: episode.thumbnail,
      sources: episode.sources,
      downloads: episode.downloads,
      providerEpisodeId: episode.providerEpisodeId,
      externalIds: episode.externalIds,
    })),
  };
}

export async function fetchAnimeSearch(request: SearchRequest) {
  const params = new URLSearchParams();

  if (request.query?.trim()) {
    params.set('query', request.query.trim());
  }

  if (request.genre) {
    params.set('genre', request.genre);
  }

  if (request.year) {
    params.set('year', request.year);
  }

  if (request.season) {
    params.set('season', request.season);
  }

  if (request.format) {
    params.set('format', request.format);
  }

  if (request.status) {
    params.set('status', request.status);
  }

  if (request.tag) {
    params.set('tag', request.tag);
  }

  if (request.sourceMaterial) {
    params.set('sourceMaterial', request.sourceMaterial);
  }

  if (request.studio) {
    params.set('studio', request.studio);
  }

  if (request.perPage) {
    params.set('perPage', String(request.perPage));
  }

  if (request.limit) {
    params.set('limit', String(request.limit));
  }

  if (request.offset !== undefined) {
    params.set('offset', String(request.offset));
  }

  if (request.quick) {
    params.set('quick', 'true');
  }

  if (request.includeFacets) {
    params.set('includeFacets', 'true');
  }

  const query = params.toString();
  return getJson<SearchPayload>(`/api/anime/search${query ? `?${query}` : ''}`, {
    cache: 'no-store',
  });
}

export async function fetchAnimeSearchFacets() {
  return getJson<SearchFacetsPayload>('/api/anime/search?facetsOnly=true', {
    next: { revalidate: 300 },
  });
}

export async function fetchWeeklySchedule() {
  return getJson<ScheduleEntry[]>('/api/anime/schedule', {
    cache: 'no-store',
  });
}
