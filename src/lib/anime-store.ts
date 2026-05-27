import type { Anime as AnimeRecord, Prisma } from '@prisma/client';

import { db } from './db';
import { JIKAN_GENRE_OPTIONS } from './jikan-genres';
import type {
  Anime,
  AnimeGridItem,
  ScheduleDayItem,
  SearchAnimeItem,
  TrendingItem,
} from './anime-data';

const DEFAULT_PAGE_SIZE = 36;
type SpotlightEntryRecord = {
  rank: number;
  title?: string | null;
  englishTitle?: string | null;
  romajiTitle?: string | null;
  nativeTitle?: string | null;
  malId?: number | null;
  animePaheId?: string | null;
  animePaheSession?: string | null;
  slug?: string | null;
  coverImage?: string | null;
  carouselImage?: string | null;
  score?: number | null;
  format?: string | null;
  seasonYear?: number | null;
  status?: string | null;
};

type SpotlightEntryMapped = {
  anime: Anime;
  record: Pick<AnimeRecord, 'description' | 'malId'>;
};
type StoredAnimeRelation = {
  malId?: number | null;
  englishTitle?: string | null;
  romajiTitle?: string | null;
  coverImage?: string | null;
  format?: string | null;
  relationType?: string | null;
};
const ANIVAULT_API_URL = process.env.ANIVAULT_API_URL?.trim() ?? '';
const descriptionCache = new Map<string, string>();
const SEARCH_FACETS_TTL_MS = 5 * 60 * 1000;
let searchFacetCache:
  | {
      expiresAt: number;
      value: {
        genres: string[];
        years: string[];
        seasons: string[];
        formats: string[];
        statuses: string[];
        studios: string[];
      };
    }
  | null = null;

type SearchFacets = {
  genres: string[];
  years: string[];
  seasons: string[];
  formats: string[];
  statuses: string[];
  studios: string[];
};
const HOME_PAGE_SELECT = {
  id: true,
  malId: true,
  animePaheId: true,
  animePaheSession: true,
  slug: true,
  title: true,
  englishTitle: true,
  romajiTitle: true,
  nativeTitle: true,
  description: true,
  format: true,
  status: true,
  episodes: true,
  duration: true,
  season: true,
  seasonYear: true,
  genre: true,
  score: true,
  coverImage: true,
  carouselImage: true,
  studios: true,
  episodeList: true,
  totalEpisodes: true,
  airedSubEpisodes: true,
  airedDubEpisodes: true,
  cachedAt: true,
  updatedAt: true,
} satisfies Prisma.AnimeSelect;
const HOME_PAGE_CARD_SELECT = {
  id: true,
  malId: true,
  animePaheId: true,
  animePaheSession: true,
  slug: true,
  title: true,
  englishTitle: true,
  romajiTitle: true,
  nativeTitle: true,
  description: true,
  format: true,
  status: true,
  episodes: true,
  duration: true,
  season: true,
  seasonYear: true,
  genre: true,
  score: true,
  coverImage: true,
  carouselImage: true,
  studios: true,
  totalEpisodes: true,
  airedSubEpisodes: true,
  airedDubEpisodes: true,
  episodeList: true,
  updatedAt: true,
} satisfies Prisma.AnimeSelect;
const SEARCH_PAGE_SELECT = {
  id: true,
  malId: true,
  title: true,
  englishTitle: true,
  romajiTitle: true,
  nativeTitle: true,
  coverImage: true,
  score: true,
  format: true,
  seasonYear: true,
  episodes: true,
  genre: true,
  status: true,
  season: true,
  studios: true,
} satisfies Prisma.AnimeSelect;

type HomePageAnimeRecord = Prisma.AnimeGetPayload<{ select: typeof HOME_PAGE_SELECT }>;
type HomePageCardAnimeRecord = Prisma.AnimeGetPayload<{ select: typeof HOME_PAGE_CARD_SELECT }>;
type SearchPageAnimeRecord = Prisma.AnimeGetPayload<{ select: typeof SEARCH_PAGE_SELECT }>;
type RawSearchAnimeRecord = {
  _id?: { $oid?: string };
  id?: string;
  malId?: number | null;
  title?: string | null;
  englishTitle?: string | null;
  romajiTitle?: string | null;
  nativeTitle?: string | null;
  coverImage?: string | null;
  score?: number | null;
  format?: string | null;
  seasonYear?: number | null;
  episodes?: number | null;
  genre?: string[] | null;
  status?: string | null;
  season?: string | null;
  studios?: string[] | null;
};

export type AnimeListQuery = {
  page?: number;
  limit?: number;
  search?: string | null;
  genre?: string | null;
  year?: number | null;
  season?: string | null;
  status?: string | null;
  format?: string | null;
  sort?: string | null;
  studio?: string | null;
  quick?: boolean;
  includeFacets?: boolean;
};

export type AnimeListResponse = {
  data: AnimeRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

function clampPage(value?: number) {
  return Math.max(1, value ?? 1);
}

function clampLimit(value?: number) {
  return Math.min(Math.max(1, value ?? DEFAULT_PAGE_SIZE), 100);
}

function buildPublicAnimeId(anime: Pick<AnimeRecord, 'id' | 'malId' | 'slug'>) {
  if (anime.malId) {
    return `mal:${anime.malId}`;
  }

  if (anime.slug) {
    return anime.slug;
  }

  return anime.id;
}

function normalizeStatus(status?: string | null) {
  const value = status?.toLowerCase() ?? '';

  if (value.includes('cancel')) {
    return 'CANCELLED';
  }

  if (value.includes('not') || value.includes('upcoming')) {
    return 'NOT_YET_RELEASED';
  }

  if (value.includes('finished') || value.includes('complete')) {
    return 'FINISHED';
  }

  if (value.includes('releas') || value.includes('air')) {
    return 'RELEASING';
  }

  return 'FINISHED';
}

function buildSearchVariants(search: string) {
  const trimmed = search.trim();
  const lower = trimmed.toLowerCase();
  const titleCased = lower.replace(/\b([a-z])/g, (match) => match.toUpperCase());
  const slugified = lower
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return [...new Set([trimmed, lower, titleCased, slugified].filter(Boolean))];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildTitleLikeRegex(value: string) {
  const normalized = value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  if (!normalized) {
    return null;
  }

  const pattern = normalized
    .split(/\s+/)
    .map((part) => escapeRegex(part))
    .join('[-\\s:]+');

  return `^${pattern}$`;
}

function formatDurationLabel(duration?: number | null) {
  if (!duration) {
    return 'TBA';
  }

  if (duration >= 60) {
    const hours = Math.floor(duration / 60);
    const minutes = duration % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return `${duration}m`;
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function readLooseString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function readLooseNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function normalizeTitle(value?: string | null) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function normalizeLooseTitle(value?: string | null) {
  return normalizeTitle(value)
    .replace(/\b(\d+(st|nd|rd|th)?|first|second|third|fourth|fifth)\s+season\b/g, ' ')
    .replace(/\bseason\s+\d+\b/g, ' ')
    .replace(/\bpart\s+\d+\b/g, ' ')
    .replace(/\bcour\s+\d+\b/g, ' ')
    .replace(/\b2nd\b|\b3rd\b|\b4th\b|\b5th\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function romanToNumber(value: string) {
  const numerals: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
  };

  return numerals[value.toLowerCase()] ?? null;
}

function extractInstallmentNumbers(value?: string | null) {
  const normalized = normalizeTitle(value);
  if (!normalized) {
    return [];
  }

  const numbers = new Set<string>();
  const pushMatches = (regex: RegExp, parser?: (raw: string) => string | null) => {
    for (const match of normalized.matchAll(regex)) {
      const raw = match[1];
      const parsed = parser ? parser(raw) : raw;
      if (parsed) {
        numbers.add(parsed);
      }
    }
  };

  pushMatches(/\b(\d+)(?:st|nd|rd|th)?\s+season\b/g);
  pushMatches(/\bseason\s+(\d+)\b/g);
  pushMatches(/\bpart\s+(\d+)\b/g);
  pushMatches(/\bcour\s+(\d+)\b/g);
  pushMatches(/\b(first|second|third|fourth|fifth)\s+season\b/g, (raw) => {
    const mapping: Record<string, string> = {
      first: '1',
      second: '2',
      third: '3',
      fourth: '4',
      fifth: '5',
    };

    return mapping[raw] ?? null;
  });
  pushMatches(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x)\b/g, (raw) => {
    const parsed = romanToNumber(raw);
    return parsed ? String(parsed) : null;
  });

  return [...numbers];
}

function hasCompatibleInstallmentNumbers(candidateLabel: string, titleValue?: string | null) {
  const candidateNumbers = extractInstallmentNumbers(candidateLabel);
  if (candidateNumbers.length === 0) {
    return true;
  }

  const titleNumbers = new Set(extractInstallmentNumbers(titleValue));
  return candidateNumbers.every((value) => titleNumbers.has(value));
}

function scoreSpotlightMatch(
  anime: Pick<AnimeRecord, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>,
  label: string
) {
  const exactCandidate = normalizeTitle(label);
  const looseCandidate = normalizeLooseTitle(label);

  if (!exactCandidate && !looseCandidate) {
    return 0;
  }

  const titleVariants = [
    { value: anime.title, exactWeight: 120, looseWeight: 110 },
    { value: anime.englishTitle, exactWeight: 115, looseWeight: 105 },
    { value: anime.romajiTitle, exactWeight: 112, looseWeight: 102 },
    { value: anime.nativeTitle, exactWeight: 95, looseWeight: 88 },
  ];

  let score = 0;

  for (const variant of titleVariants) {
    if (!hasCompatibleInstallmentNumbers(label, variant.value)) {
      continue;
    }

    const exactTitle = normalizeTitle(variant.value);
    const looseTitle = normalizeLooseTitle(variant.value);

    if (exactCandidate && exactTitle && exactTitle === exactCandidate) {
      score = Math.max(score, variant.exactWeight);
    }

    if (looseCandidate && looseTitle && looseTitle === looseCandidate) {
      score = Math.max(score, variant.looseWeight);
    }

    if (
      looseCandidate.length >= 12 &&
      looseTitle.length >= 12 &&
      (looseTitle.includes(looseCandidate) || looseCandidate.includes(looseTitle))
    ) {
      score = Math.max(score, 70);
    }
  }

  return score;
}

function resolveSpotlightAnimeByTitle(
  label: string,
  animeList: Pick<
    AnimeRecord,
    | 'id'
    | 'malId'
    | 'slug'
    | 'title'
    | 'englishTitle'
    | 'romajiTitle'
    | 'nativeTitle'
    | 'description'
    | 'format'
    | 'status'
    | 'episodes'
    | 'duration'
    | 'season'
    | 'seasonYear'
    | 'genre'
    | 'score'
    | 'coverImage'
    | 'carouselImage'
    | 'studios'
    | 'animePaheId'
    | 'animePaheSession'
    | 'episodeList'
    | 'totalEpisodes'
    | 'airedSubEpisodes'
    | 'airedDubEpisodes'
    | 'updatedAt'
  >[]
) {
  const ranked = animeList
    .map((anime) => ({
      anime,
      score: scoreSpotlightMatch(anime, label),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (right.anime.score ?? 0) - (left.anime.score ?? 0);
    });

  return ranked[0]?.anime ?? null;
}

function extractDescriptionRef(anime: Pick<AnimeRecord, 'description' | 'malId'>) {
  const rootDescription = anime.description?.trim();
  if (rootDescription && (/^mal:\d+$/i.test(rootDescription) || /^https?:\/\//i.test(rootDescription))) {
    return rootDescription;
  }

  return anime.malId ? `mal:${anime.malId}` : null;
}

async function resolveDescriptionReference(ref: string) {
  const cached = descriptionCache.get(ref);
  if (cached && cached.trim()) {
    return cached;
  }

  let resolved = '';

  const malMatch = ref.match(/(?:mal:|myanimelist\.net\/anime\/)(\d+)/i);
  if (malMatch) {
    try {
      if (!ANIVAULT_API_URL) {
        throw new Error('ANIVAULT_API_URL is required.');
      }

      const url = new URL('/api/anime/description', ANIVAULT_API_URL);
      url.searchParams.set('malId', malMatch[1]);
      const response = await fetch(url, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (response.ok) {
        const payload = (await response.json()) as { description?: string };
        resolved = payload.description?.trim() ?? '';
      }
    } catch {
      resolved = '';
    }
  }

  if (resolved) {
    descriptionCache.set(ref, resolved);
  }
  return resolved;
}

async function getFeaturedAnimeFromStoredSpotlights() {
  const airingStatuses = ['RELEASING', 'Currently Airing', 'Airing'];
  const spotlightResult = (await db.$runCommandRaw({
    find: 'SpotlightEntry',
    filter: { source: 'anixplay-home-spotlights' },
    sort: { rank: 1 },
    limit: 10,
  })) as {
    cursor?: {
      firstBatch?: SpotlightEntryRecord[];
    };
  };
  const spotlightEntries = spotlightResult.cursor?.firstBatch ?? [];

  const mapSpotlightEntryToAnime = (entry: SpotlightEntryRecord): SpotlightEntryMapped | null => {
    const malId = readLooseNumber(entry.malId);
    const slug = readLooseString(entry.slug);
    const title = readLooseString(entry.title, entry.englishTitle, entry.romajiTitle, entry.nativeTitle) ?? '';

    if (!title) {
      return null;
    }

    const coverImage = readLooseString(entry.coverImage) ?? '';
    const carouselImage = readLooseString(entry.carouselImage, coverImage) ?? coverImage;
    const animePaheId = readLooseString(entry.animePaheId);
    const animePaheSession = readLooseString(entry.animePaheSession);
    const description = '';
    const format = readLooseString(entry.format) ?? 'TV';
    const seasonYear = readLooseNumber(entry.seasonYear) ?? 0;
    const status = readLooseString(entry.status);
    const score = readLooseNumber(entry.score) ?? 0;
    const publicId = malId ? `mal:${malId}` : slug || `spotlight:${entry.rank}`;

    return {
      anime: {
        id: publicId,
        title,
        englishTitle: readLooseString(entry.englishTitle),
        romajiTitle: readLooseString(entry.romajiTitle),
        nativeTitle: readLooseString(entry.nativeTitle),
        description,
        carouselImage,
        coverImage,
        score,
        format,
        year: seasonYear,
        genre: [],
        status,
        studios: [],
        sourceApi: 'jikan',
        malId,
        animePaheId,
        animePaheSession,
        subbed: 0,
        dubbed: 0,
      },
      record: {
        description,
        malId: malId ?? null,
      },
    };
  };

  const spotlightRanked = spotlightEntries
    .map(mapSpotlightEntryToAnime)
    .filter((entry): entry is SpotlightEntryMapped => entry !== null);

  if (spotlightRanked.length > 0) {
    const deduped = dedupePublicAnimeList(spotlightRanked.map((entry) => entry.anime)).slice(0, 10);
    const hydrated = await Promise.all(
      deduped.map((anime) => {
        const matched = spotlightRanked.find((entry) => entry.anime.id === anime.id);
        return hydrateDescription(
          matched?.record ?? { description: anime.description, malId: anime.malId ?? null },
          anime
        );
      })
    );

    return hydrated;
  }

  const fallback = await db.anime.findMany({
    where: {
      status: { in: airingStatuses },
      OR: [{ carouselImage: { not: null } }, { coverImage: { not: null } }],
    },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    take: 10,
    select: HOME_PAGE_CARD_SELECT,
  });

  return fallback.map(mapHomeAnimeRecord);
}

export async function getFooterBackgroundImageFromDb() {
  const spotlightResult = (await db.$runCommandRaw({
    find: 'SpotlightEntry',
    filter: {
      source: 'anixplay-home-spotlights',
      $or: [
        { carouselImage: { $ne: null } },
        { coverImage: { $ne: null } },
      ],
    },
    projection: {
      carouselImage: 1,
      coverImage: 1,
    },
    sort: { rank: 1 },
    limit: 1,
  })) as {
    cursor?: {
      firstBatch?: Array<{
        carouselImage?: string | null;
        coverImage?: string | null;
      }>;
    };
  };

  const spotlightEntry = spotlightResult.cursor?.firstBatch?.[0];
  const spotlightImage = readLooseString(
    spotlightEntry?.carouselImage,
    spotlightEntry?.coverImage
  );
  if (spotlightImage) {
    return spotlightImage;
  }

  const fallback = await db.anime.findFirst({
    where: {
      OR: [{ carouselImage: { not: null } }, { coverImage: { not: null } }],
    },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    select: {
      carouselImage: true,
      coverImage: true,
    },
  });

  return readLooseString(fallback?.carouselImage, fallback?.coverImage) ?? null;
}

async function hydrateDescription<T extends { description: string }>(
  record: Pick<AnimeRecord, 'description' | 'malId'>,
  anime: T
) {
  const ref = extractDescriptionRef(record);
  if (!ref) {
    return anime;
  }

  if (/^mal:\d+$/i.test(anime.description) || /^https?:\/\//i.test(anime.description) || anime.description === '') {
    return {
      ...anime,
      description: await resolveDescriptionReference(ref),
    };
  }

  return anime;
}

function mapStoredRelations(value: unknown): Anime['relations'] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const mapped = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') {
        return null;
      }

      const relation = entry as StoredAnimeRelation;
      const malId = readLooseNumber(relation.malId);
      const title = readLooseString(
        relation.englishTitle,
        relation.romajiTitle
      );

      if (!malId || !title) {
        return null;
      }

      return {
        id: `mal:${malId}`,
        malId,
        title,
        englishTitle: readLooseString(relation.englishTitle),
        romajiTitle: readLooseString(relation.romajiTitle),
        coverImage: readLooseString(relation.coverImage) ?? '',
        format: readLooseString(relation.format) ?? 'TV',
        relationType: readLooseString(relation.relationType) ?? 'RELATED',
        year: 0,
      };
    })
    .filter((entry) => entry !== null) as NonNullable<Anime['relations']>;

  return mapped.length > 0 ? mapped : undefined;
}

async function loadRawAnimeRelations(
  anime: Pick<AnimeRecord, 'id' | 'malId'>
): Promise<Anime['relations'] | undefined> {
  const filter = anime.malId
    ? { malId: anime.malId }
    : { _id: { $oid: anime.id } };

  const result = (await db.$runCommandRaw({
    find: 'Anime',
    filter,
    projection: { relations: 1 },
    limit: 1,
  })) as {
    cursor?: {
      firstBatch?: Array<{ relations?: unknown }>;
    };
  };

  return mapStoredRelations(result.cursor?.firstBatch?.[0]?.relations);
}

function mapAnimeRecord(anime: HomePageAnimeRecord | AnimeRecord): Anime {
  return {
    id: buildPublicAnimeId(anime),
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    description: anime.description ?? '',
    carouselImage: anime.carouselImage ?? anime.coverImage ?? '',
    coverImage: anime.coverImage ?? '',
    score: anime.score ?? 0,
    format: anime.format ?? 'TV',
    year: anime.seasonYear ?? 0,
    episodes: anime.totalEpisodes ?? anime.episodes ?? undefined,
    totalEpisodes: anime.totalEpisodes ?? anime.episodes ?? undefined,
    airedSubEpisodes: anime.airedSubEpisodes ?? undefined,
    airedDubEpisodes: anime.airedDubEpisodes ?? undefined,
    genre: anime.genre,
    status: anime.status ?? undefined,
    season: anime.season ?? undefined,
    duration: anime.duration ?? undefined,
    studios: anime.studios,
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
    animePaheId: anime.animePaheId ?? undefined,
    animePaheSession: anime.animePaheSession ?? undefined,
    source: undefined,
    subbed:
      anime.airedSubEpisodes ?? anime.totalEpisodes ?? anime.episodes ?? 0,
    dubbed:
      anime.airedDubEpisodes ?? 0,
    relations: mapStoredRelations((anime as AnimeRecord & { relations?: unknown }).relations),
    episodeList: Array.isArray(anime.episodeList)
      ? (anime.episodeList as unknown as Anime['episodeList'])
      : undefined,
  };
}

function mapHomeAnimeRecord(anime: HomePageCardAnimeRecord): Anime {
  return {
    id: buildPublicAnimeId(anime),
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    description: anime.description ?? '',
    carouselImage: anime.carouselImage ?? anime.coverImage ?? '',
    coverImage: anime.coverImage ?? '',
    score: anime.score ?? 0,
    format: anime.format ?? 'TV',
    year: anime.seasonYear ?? 0,
    episodes: anime.totalEpisodes ?? anime.episodes ?? undefined,
    totalEpisodes: anime.totalEpisodes ?? anime.episodes ?? undefined,
    genre: anime.genre,
    status: anime.status ?? undefined,
    season: anime.season ?? undefined,
    duration: anime.duration ?? undefined,
    studios: anime.studios,
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
    animePaheId: anime.animePaheId ?? undefined,
    animePaheSession: anime.animePaheSession ?? undefined,
    subbed: anime.airedSubEpisodes ?? anime.totalEpisodes ?? anime.episodes ?? 0,
    dubbed: anime.airedDubEpisodes ?? 0,
  };
}

function mapAnimeGridItem(anime: HomePageCardAnimeRecord): AnimeGridItem {
  return {
    id: buildPublicAnimeId(anime),
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    thumbnail: anime.coverImage ?? '',
    score: anime.score ?? 0,
    rating: 'PG-13',
    currentEpisode: anime.totalEpisodes ?? anime.episodes ?? 0,
    watchedEpisodes: 0,
    totalEpisodes: anime.totalEpisodes ?? anime.episodes ?? 0,
    format: anime.format ?? 'TV',
    duration: formatDurationLabel(anime.duration),
    subDub: 'sub',
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
  };
}

function mapTrendingItem(anime: HomePageCardAnimeRecord, rank: number): TrendingItem {
  return {
    id: buildPublicAnimeId(anime),
    rank,
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    score: anime.score ?? 0,
    format: anime.format ?? 'TV',
    views: Math.round((anime.score ?? 0) * 1000),
    comments: anime.episodes ?? 0,
    coverImage: anime.coverImage ?? '',
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
  };
}

function dedupePublicAnimeList(items: Anime[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

function mapSearchItem(anime: SearchPageAnimeRecord | HomePageAnimeRecord | AnimeRecord): SearchAnimeItem {
  return {
    id: buildPublicAnimeId(anime),
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    coverImage: anime.coverImage ?? '',
    score: anime.score ?? 0,
    format: anime.format ?? 'TV',
    year: anime.seasonYear ?? 0,
    episodes: anime.episodes ?? undefined,
    genre: anime.genre,
    status: anime.status ?? 'Unknown',
    season: anime.season ?? '',
    subDub: 'sub',
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
    studios: anime.studios,
    sourceMaterial: undefined,
  };
}

function mapRawSearchItem(anime: RawSearchAnimeRecord): SearchAnimeItem {
  const id = anime.id ?? anime._id?.$oid ?? '';
  const malId = typeof anime.malId === 'number' ? anime.malId : undefined;
  const slugSource = anime.title?.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') ?? id;

  return {
    id: malId ? `mal:${malId}` : slugSource || id,
    title: anime.title ?? '',
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    coverImage: anime.coverImage ?? '',
    score: anime.score ?? 0,
    format: anime.format ?? 'TV',
    year: anime.seasonYear ?? 0,
    episodes: anime.episodes ?? undefined,
    genre: Array.isArray(anime.genre) ? anime.genre : [],
    status: anime.status ?? 'Unknown',
    season: anime.season ?? '',
    subDub: 'sub',
    sourceApi: 'jikan',
    malId,
    studios: Array.isArray(anime.studios) ? anime.studios : undefined,
    sourceMaterial: undefined,
  };
}

async function searchAnimeByRegex(search: string, limit: number, offset: number) {
  const pattern = escapeRegex(search.trim()).replace(/\s+/g, '.*');
  if (!pattern) {
    return {
      items: [] as SearchAnimeItem[],
      total: 0,
    };
  }

  const filter = {
    $or: [
      { title: { $regex: pattern, $options: 'i' } },
      { englishTitle: { $regex: pattern, $options: 'i' } },
      { romajiTitle: { $regex: pattern, $options: 'i' } },
      { nativeTitle: { $regex: pattern, $options: 'i' } },
      { slug: { $regex: escapeRegex(search.trim().toLowerCase()).replace(/\s+/g, '-'), $options: 'i' } },
    ],
  };

  const [findResult, countResult] = await Promise.all([
    db.$runCommandRaw({
      find: 'Anime',
      filter,
      projection: {
        malId: 1,
        title: 1,
        englishTitle: 1,
        romajiTitle: 1,
        nativeTitle: 1,
        coverImage: 1,
        score: 1,
        format: 1,
        seasonYear: 1,
        episodes: 1,
        genre: 1,
        status: 1,
        season: 1,
        studios: 1,
      },
      sort: {
        score: -1,
        updatedAt: -1,
      },
      skip: offset,
      limit,
    }),
    db.$runCommandRaw({
      count: 'Anime',
      query: filter,
    }),
  ]) as [
    { cursor?: { firstBatch?: RawSearchAnimeRecord[] } },
    { n?: number }
  ];

  return {
    items: (findResult.cursor?.firstBatch ?? []).map(mapRawSearchItem),
    total: typeof countResult.n === 'number' ? countResult.n : 0,
  };
}

function mapScheduleItem(anime: HomePageAnimeRecord | AnimeRecord, index: number): ScheduleDayItem {
  return {
    id: buildPublicAnimeId(anime),
    title: anime.title,
    englishTitle: anime.englishTitle ?? undefined,
    romajiTitle: anime.romajiTitle ?? undefined,
    nativeTitle: anime.nativeTitle ?? undefined,
    coverImage: anime.coverImage ?? '',
    time: 'TBA',
    episode: anime.episodes ?? index + 1,
    description: anime.description ?? '',
    genre: anime.genre,
    isAired: normalizeStatus(anime.status) === 'FINISHED',
    sourceApi: 'jikan',
    malId: anime.malId ?? undefined,
  };
}

function buildAnimeWhere(query: AnimeListQuery): Prisma.AnimeWhereInput {
  const where: Prisma.AnimeWhereInput = {};
  const andConditions: Prisma.AnimeWhereInput[] = [];
  const search = query.search?.trim();
  const normalizedStatus = query.status ? normalizeStatus(query.status) : null;
  const normalizedSort = query.sort?.trim().toLowerCase() ?? '';

  if (search) {
    const variants = buildSearchVariants(search);
    andConditions.push({
      OR: [
        ...variants.flatMap((variant) => ([
          { title: { contains: variant } },
          { englishTitle: { contains: variant } },
          { romajiTitle: { contains: variant } },
          { nativeTitle: { contains: variant } },
        ])),
        { slug: { contains: search.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') } },
      ],
    });
  }

  if (query.genre) {
    andConditions.push({ genre: { has: query.genre } });
  }

  if (query.year) {
    andConditions.push({ seasonYear: query.year });
  }

  if (query.season) {
    andConditions.push({
      season: {
        equals: query.season,
        mode: 'insensitive',
      },
    });
  }

  if (query.status) {
    if (normalizedStatus === 'RELEASING') {
      andConditions.push({
        status: { in: ['RELEASING', 'Currently Airing', 'Airing'] },
      });
    } else if (normalizedStatus === 'NOT_YET_RELEASED') {
      andConditions.push({
        status: { in: ['NOT_YET_RELEASED', 'Not yet aired', 'Upcoming'] },
      });
    } else if (normalizedStatus === 'CANCELLED') {
      andConditions.push({
        status: { in: ['CANCELLED', 'Cancelled', 'Canceled'] },
      });
    } else {
      andConditions.push({
        status: { in: ['FINISHED', 'Finished Airing', 'Finished'] },
      });
    }
  }

  if (query.format) {
    andConditions.push({ format: query.format });
  }

  if (query.studio) {
    andConditions.push({ studios: { has: query.studio } });
  }

  const shouldHideNotYetAiredByDefault =
    !search &&
    !query.status &&
    normalizedSort !== 'upcoming';

  if (shouldHideNotYetAiredByDefault) {
    andConditions.push({
      NOT: {
        status: { in: ['NOT_YET_RELEASED', 'Not yet aired', 'Upcoming'] },
      },
    });
  }

  if (andConditions.length > 0) {
    where.AND = andConditions;
  }

  return where;
}

function buildAnimeOrderBy(sort?: string | null): Prisma.AnimeOrderByWithRelationInput[] {
  switch (sort?.toLowerCase()) {
    case 'oldest':
      return [{ seasonYear: 'asc' }, { updatedAt: 'asc' }, { title: 'asc' }];
    case 'latest':
    case 'newest':
      return [{ seasonYear: 'desc' }, { updatedAt: 'desc' }, { title: 'asc' }];
    case 'title':
      return [{ title: 'asc' }];
    case 'score':
    case 'top rated':
      return [{ score: 'desc' }, { updatedAt: 'desc' }];
    case 'updated':
    case 'new':
      return [{ updatedAt: 'desc' }];
    case 'airing':
      return [{ score: 'desc' }, { updatedAt: 'desc' }];
    case 'upcoming':
      return [{ seasonYear: 'asc' }, { score: 'desc' }, { title: 'asc' }];
    case 'popular':
    case 'trending':
      return [{ score: 'desc' }, { updatedAt: 'desc' }, { seasonYear: 'desc' }];
    default:
      return [{ seasonYear: 'desc' }, { updatedAt: 'desc' }, { score: 'desc' }, { title: 'asc' }];
  }
}

export async function listAnime(query: AnimeListQuery): Promise<AnimeListResponse> {
  const page = clampPage(query.page);
  const limit = clampLimit(query.limit);
  const where = buildAnimeWhere(query);
  const orderBy = buildAnimeOrderBy(query.sort);

  const [total, data] = await Promise.all([
    db.anime.count({ where }),
    db.anime.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getAnimeByIdentifier(identifier: string) {
  const trimmed = identifier.trim();

  if (!trimmed) {
    return null;
  }

  if (/^[a-f0-9]{24}$/i.test(trimmed)) {
    const byObjectId = await db.anime.findUnique({ where: { id: trimmed } });
    if (byObjectId) {
      return byObjectId;
    }
  }

  if (trimmed.startsWith('mal:') || trimmed.startsWith('jikan:')) {
    const value = Number.parseInt(trimmed.split(':')[1] ?? '', 10);
    if (!Number.isNaN(value)) {
      return db.anime.findUnique({ where: { malId: value } });
    }
  }

  if (/^\d+$/.test(trimmed)) {
    const numericId = Number.parseInt(trimmed, 10);
    return db.anime.findUnique({ where: { malId: numericId } });
  }

  const bySlug = await db.anime.findUnique({ where: { slug: trimmed.toLowerCase() } });
  if (bySlug) {
    return bySlug;
  }

  const titleRegex = buildTitleLikeRegex(trimmed);
  if (!titleRegex) {
    return null;
  }

  const rawTitleMatch = (await db.$runCommandRaw({
    find: 'Anime',
    filter: {
      $or: [
        { slug: { $regex: titleRegex, $options: 'i' } },
        { title: { $regex: titleRegex, $options: 'i' } },
        { englishTitle: { $regex: titleRegex, $options: 'i' } },
        { romajiTitle: { $regex: titleRegex, $options: 'i' } },
        { nativeTitle: { $regex: titleRegex, $options: 'i' } },
      ],
    } as unknown as Prisma.InputJsonObject,
    limit: 1,
  })) as { cursor?: { firstBatch?: Array<Record<string, unknown>> } };

  const entry = rawTitleMatch.cursor?.firstBatch?.[0];
  const resolvedId =
    typeof entry?._id === 'object' &&
    entry._id &&
    '$oid' in (entry._id as Record<string, unknown>)
      ? String((entry._id as Record<string, unknown>).$oid)
      : typeof entry?.id === 'string'
        ? entry.id
        : null;

  if (!resolvedId) {
    return null;
  }

  return db.anime.findUnique({ where: { id: resolvedId } });
}

export async function getAnimeByMalId(malId: number) {
  return db.anime.findUnique({ where: { malId } });
}

export async function getAnimeSearchPayload(query: AnimeListQuery) {
  const page = clampPage(query.page);
  const limit = clampLimit(query.limit);
  const offset = (page - 1) * limit;
  const trimmedSearch = query.search?.trim() ?? '';

  if (query.quick && trimmedSearch) {
    const quickResult = await searchAnimeByRegex(trimmedSearch, limit, offset);

    return {
      items: quickResult.items,
      total: quickResult.total,
      limit,
      offset,
      facets: searchFacetCache?.value,
    };
  }

  const where = buildAnimeWhere(query);
  const orderBy = buildAnimeOrderBy(query.sort);
  const [total, items] = await Promise.all([
    db.anime.count({ where }),
    db.anime.findMany({
      where,
      orderBy,
      skip: offset,
      take: limit,
      select: SEARCH_PAGE_SELECT,
    }),
  ]);
  const fallback =
    total === 0 && trimmedSearch
      ? await searchAnimeByRegex(trimmedSearch, limit, offset)
      : null;
  const facets = query.includeFacets === false ? undefined : await getAnimeSearchFacets();

  return {
    items: fallback ? fallback.items : items.map(mapSearchItem),
    total: fallback ? fallback.total : total,
    limit,
    offset,
    facets,
  };
}

export async function getAnimeSearchFacets(): Promise<SearchFacets> {
  const now = Date.now();
  if (!searchFacetCache || searchFacetCache.expiresAt <= now) {
    const facetRows = await db.anime.findMany({
      select: {
        genre: true,
        studios: true,
        seasonYear: true,
        season: true,
        format: true,
        status: true,
      },
    });

    const genres = new Set<string>();
    const studios = new Set<string>();
    const years = new Set<string>();
    const seasons = new Set<string>();
    const formats = new Set<string>();
    const statuses = new Set<string>();

    for (const anime of facetRows) {
      for (const genre of anime.genre) {
        if (genre) {
          genres.add(genre);
        }
      }

      for (const studio of anime.studios) {
        if (studio) {
          studios.add(studio);
        }
      }

      if (anime.seasonYear) {
        years.add(String(anime.seasonYear));
      }

      if (anime.season) {
        seasons.add(anime.season);
      }

      if (anime.format) {
        formats.add(anime.format);
      }

      if (anime.status) {
        statuses.add(anime.status);
      }
    }

    const canonicalGenres = [...JIKAN_GENRE_OPTIONS];
    const dbOnlyGenres = [...genres]
      .filter((genre) => !canonicalGenres.includes(genre as (typeof JIKAN_GENRE_OPTIONS)[number]))
      .sort((left, right) => left.localeCompare(right));

    searchFacetCache = {
      expiresAt: now + SEARCH_FACETS_TTL_MS,
      value: {
        genres: [...canonicalGenres, ...dbOnlyGenres],
        years: [...years].sort((left, right) => Number(right) - Number(left)),
        seasons: [...seasons].sort((left, right) => left.localeCompare(right)),
        formats: [...formats].sort((left, right) => left.localeCompare(right)),
        statuses: [...statuses].sort((left, right) => left.localeCompare(right)),
        studios: [...studios].sort((left, right) => left.localeCompare(right)),
      },
    };
  }

  return searchFacetCache.value;
}

export async function getHomePageFromDb() {
  const releasedStatuses = ['RELEASING', 'FINISHED', 'Currently Airing', 'Finished Airing', 'Airing'];

  const [featuredAnime, latest, recent, upcoming, trending] = await Promise.all([
    getFeaturedAnimeFromStoredSpotlights(),
    db.anime.findMany({
      where: { status: { in: releasedStatuses } },
      orderBy: [{ seasonYear: 'desc' }, { score: 'desc' }, { updatedAt: 'desc' }],
      take: 12,
      select: HOME_PAGE_CARD_SELECT,
    }),
    db.anime.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 12,
      select: HOME_PAGE_CARD_SELECT,
    }),
    db.anime.findMany({
      where: { status: { in: ['NOT_YET_RELEASED', 'Not yet aired', 'Upcoming'] } },
      orderBy: [{ seasonYear: 'asc' }, { score: 'desc' }, { title: 'asc' }],
      take: 12,
      select: HOME_PAGE_CARD_SELECT,
    }),
    db.anime.findMany({
      where: { status: { in: releasedStatuses } },
      orderBy: [
        { score: 'desc' },
        { updatedAt: 'desc' },
        { seasonYear: 'desc' },
      ],
      take: 10,
      select: HOME_PAGE_CARD_SELECT,
    }),
  ]);

  return {
    featuredAnime,
    latestEpisodes: latest.map(mapAnimeGridItem),
    newOnSite: recent.map(mapHomeAnimeRecord),
    upcomingAnime: upcoming.map(mapHomeAnimeRecord),
    trendingAnime: trending.map((anime, index) => mapTrendingItem(anime, index + 1)),
  };
}

export async function getWeeklyScheduleFromDb() {
  const items = await db.anime.findMany({
    where: { status: { in: ['RELEASING', 'Currently Airing'] } },
    orderBy: [{ score: 'desc' }, { updatedAt: 'desc' }],
    take: 50,
  });

  return Promise.all(
    items.map(async (anime, index) =>
      hydrateDescription(anime, mapScheduleItem(anime, index))
    )
  );
}

export function mapDbAnimeToPublicAnime(anime: AnimeRecord) {
  return mapAnimeRecord(anime);
}

export async function mapDbAnimeToPublicAnimeWithResolvedDescription(anime: AnimeRecord) {
  const mapped = await hydrateDescription(anime, mapAnimeRecord(anime));
  return {
    ...mapped,
    relations: await loadRawAnimeRelations(anime),
  };
}
