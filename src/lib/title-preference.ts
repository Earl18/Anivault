import type {
  Anime,
  AnimeGridItem,
  ScheduleDayItem,
  SearchAnimeItem,
  TrendingItem,
} from '@/lib/anime-data';

export type TitlePreference = 'en' | 'jp';

type TitleCarrier =
  | Pick<Anime, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>
  | Pick<AnimeGridItem, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>
  | Pick<SearchAnimeItem, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>
  | Pick<TrendingItem, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>
  | Pick<ScheduleDayItem, 'title' | 'englishTitle' | 'romajiTitle' | 'nativeTitle'>;

export const TITLE_PREFERENCE_STORAGE_KEY = 'anivault-title-preference';

function readNonEmptyTitle(value?: string | null) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function getPreferredTitle(item: TitleCarrier, preference: TitlePreference) {
  if (preference === 'jp') {
    return (
      readNonEmptyTitle(item.romajiTitle) ??
      readNonEmptyTitle(item.nativeTitle) ??
      readNonEmptyTitle(item.title) ??
      readNonEmptyTitle(item.englishTitle) ??
      ''
    );
  }

  return (
    readNonEmptyTitle(item.englishTitle) ??
    readNonEmptyTitle(item.title) ??
    readNonEmptyTitle(item.romajiTitle) ??
    readNonEmptyTitle(item.nativeTitle) ??
    ''
  );
}
