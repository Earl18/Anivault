export type AnimeSourceApi = 'jikan';

export interface AnimeEpisodeSource {
  provider: string;
  label: string;
  language: 'sub' | 'dub';
  type: 'embed' | 'stream' | 'download';
  url: string;
}

export interface AnimeEpisodeItem {
  number: number;
  title: string;
  airedAt?: string;
  isAired: boolean;
  thumbnail?: string;
  sources: AnimeEpisodeSource[];
  downloads: AnimeEpisodeSource[];
  providerEpisodeId?: string;
  externalIds?: {
    animePaheEpisodeSession?: string;
  };
}

export interface AnimeExternalLinks {
  mal?: string;
  anikotoSeries?: string;
  animePahe?: string;
}

export interface Anime {
  id: string;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  description: string;
  carouselImage: string;
  coverImage: string;
  score: number;
  format: string;
  year: number;
  episodes?: number;
  totalEpisodes?: number;
  airedSubEpisodes?: number;
  airedDubEpisodes?: number;
  genre: string[];
  color?: string;
  status?: string;
  season?: string;
  duration?: number;
  studios?: string[];
  rating?: string;
  source?: string;
  subbed?: number;
  dubbed?: number;
  sourceApi?: AnimeSourceApi;
  malId?: number;
  animePaheId?: string;
  animePaheSession?: string;
  episodeList?: AnimeEpisodeItem[];
  externalLinks?: AnimeExternalLinks;
  relations?: {
    id: string;
    malId?: number;
    englishTitle?: string;
    romajiTitle?: string;
    coverImage: string;
    format: string;
    relationType: string;
    title: string;
    year: number;
  }[];
  characters?: {
    name: string;
    role: string;
    image?: string;
  }[];
  startDate?: string;
}

export interface Episode {
  id: string;
  animeId: string;
  animeTitle: string;
  animeCover: string;
  episodeNumber: number;
  thumbnail: string;
  title?: string;
  airingAt?: string;
}

export interface AnimeGridItem {
  id: string;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  thumbnail: string;
  score: number;
  rating: string;
  currentEpisode: number;
  watchedEpisodes: number;
  totalEpisodes: number;
  format: string;
  duration: string;
  subDub: 'sub' | 'dub' | 'both';
  sourceApi?: AnimeSourceApi;
  malId?: number;
}

export interface TrendingItem {
  id: string;
  rank: number;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  score: number;
  format: string;
  views: number;
  comments: number;
  coverImage: string;
  sourceApi?: AnimeSourceApi;
  malId?: number;
}

export interface SearchAnimeItem {
  id: string;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  coverImage: string;
  score: number;
  format: string;
  year: number;
  episodes?: number;
  genre: string[];
  status: string;
  season: string;
  subDub: 'sub' | 'dub' | 'both';
  sourceApi?: AnimeSourceApi;
  malId?: number;
  studios?: string[];
  sourceMaterial?: string;
}

export interface ScheduleDayItem {
  id: string;
  title: string;
  englishTitle?: string;
  romajiTitle?: string;
  nativeTitle?: string;
  coverImage: string;
  time: string;
  episode: number;
  description: string;
  genre: string[];
  isAired: boolean;
  sourceApi?: AnimeSourceApi;
  malId?: number;
}
