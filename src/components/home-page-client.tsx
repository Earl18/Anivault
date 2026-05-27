'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Star, Play, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { Header } from '@/components/header';
import { SideDock } from '@/components/side-dock';
import { HeroCarousel } from '@/components/hero-carousel';
import { ScheduleSection } from '@/components/schedule-section';
import { MobileNav } from '@/components/mobile-nav';
import { LatestEpisodesGrid } from '@/components/latest-episodes-grid';
import { QuickSearchModal, SearchPage } from '@/components/search-page';
import { SchedulePage } from '@/components/schedule-page';
import { SettingsPage } from '@/components/settings-page';
import { AnimeDetailPage } from '@/components/anime-detail-page';
import { AnimeWatchPage } from '@/components/anime-watch-page';
import { MarqueeTitle } from '@/components/ui/marquee-title';
import type { Anime, AnimeGridItem, SearchAnimeItem, TrendingItem } from '@/lib/anime-data';
import {
  buildAnimeLookupId,
  fetchAnimeById,
  fetchAnimeSearchFacets,
  fetchAnimeWatchPayload,
  hydrateAnimeWithWatchPayload,
  type HomePagePayload,
  type SearchFacets,
} from '@/lib/anime-client';
import {
  getPreferredTitle,
  TITLE_PREFERENCE_STORAGE_KEY,
  type TitlePreference,
} from '@/lib/title-preference';

const ITEMS_PER_PAGE = 12;
type AppView = 'home' | 'search' | 'schedule' | 'settings' | 'detail' | 'watch';
const SEARCH_FACETS_CACHE_KEY = 'anivault.search-facets';
const SEARCH_FACETS_CACHE_TTL_MS = 5 * 60 * 1000;

function hasPlayableWatchPayload(payload: { episodes: { sources: Array<unknown> }[]; selectedEpisode: { sources: Array<unknown> } | null }) {
  return payload.episodes.length > 0 && Boolean(payload.selectedEpisode && payload.selectedEpisode.sources.length > 0);
}

function logWatchPayloadResult(context: string, animeTitle: string, episode: number, payload: { provider?: unknown; episodes: Array<{ sources: Array<unknown> }>; selectedEpisode: { sources: Array<unknown> } | null } | null) {
  if (!payload) {
    console.warn(`[watch-ui] ${context} | anime="${animeTitle}" | episode=${episode} | payload=null`);
    return;
  }

  console.info(
    `[watch-ui] ${context} | anime="${animeTitle}" | episode=${episode} | provider=${typeof payload.provider === 'string' ? payload.provider : 'none'} | episodes=${payload.episodes.length} | sources=${payload.selectedEpisode?.sources.length ?? 0}`
  );
}

function PortraitAnimeCard({
  anime,
  index,
  titlePreference,
  onClick,
}: {
  anime: Anime;
  index: number;
  titlePreference: TitlePreference;
  onClick?: () => void;
}) {
  const displayTitle = getPreferredTitle(anime, titlePreference);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04 }}
      className="group relative flex flex-col rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:border-primary/30 hover:scale-[1.03]"
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 30px rgba(139, 92, 246, 0.2)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `none`;
      }}
    >
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={anime.coverImage}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        </div>

        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-primary text-xs font-bold">
          <Star className="w-3 h-3 fill-primary text-primary" />
          {anime.score.toFixed(1)}
        </div>

        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white/60 text-[10px] font-medium">
          {anime.format}
        </div>

        {anime.genre.length > 0 && (
          <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
            {anime.genre.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-black/70 backdrop-blur-sm text-white/70"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 flex-1 flex flex-col gap-1">
        <div className="flex items-start gap-1.5">
          <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(139,92,246,0.55)]" />
          <MarqueeTitle
            text={displayTitle}
            className="text-xs font-semibold text-white group-hover:text-primary transition-colors leading-tight"
          />
        </div>
        <div className="flex items-center gap-1.5 pl-4 text-[10px] text-white/40">
          <span>{anime.format}</span>
          <span className="text-white/20">·</span>
          <span>{anime.year}</span>
          {anime.episodes && (
            <>
              <span className="text-white/20">·</span>
              <span>{anime.episodes} eps</span>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function PortraitGridSection({
  title,
  icon: Icon,
  animeList,
  titlePreference,
  showViewAll = true,
  onAnimeClick,
}: {
  title: string;
  icon: React.ElementType;
  animeList: Anime[];
  titlePreference: TitlePreference;
  showViewAll?: boolean;
  onAnimeClick?: (anime: Anime) => void;
}) {
  const [page, setPage] = useState(0);

  const totalPages = Math.ceil(animeList.length / ITEMS_PER_PAGE);
  const displayItems = animeList.slice(page * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE + ITEMS_PER_PAGE);

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          <Icon className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight text-white/90">{title}</h2>
        </div>
        <div className="flex items-center gap-4">
          {showViewAll && (
            <button className="flex items-center gap-1 text-xs text-white/40 hover:text-primary transition-colors">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          )}

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/30 tabular-nums">
                {page + 1}/{totalPages}
              </span>
              <button
                onClick={handlePrev}
                disabled={page === 0}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNext}
                disabled={page >= totalPages - 1}
                className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
        >
          {displayItems.map((anime, i) => (
            <PortraitAnimeCard
              key={anime.id}
              anime={anime}
              index={i}
              titlePreference={titlePreference}
              onClick={() => onAnimeClick?.(anime)}
            />
          ))}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

export function HomePageClient({
  initialHomeData,
}: {
  initialHomeData: HomePagePayload;
}) {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [isRouteReady, setIsRouteReady] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);
  const [watchEpisode, setWatchEpisode] = useState(1);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState(false);
  const [searchPageInitialQuery, setSearchPageInitialQuery] = useState('');
  const [homeData, setHomeData] = useState(initialHomeData);
  const [searchFacets, setSearchFacets] = useState<SearchFacets>({
    genres: [],
    years: [],
    seasons: [],
    formats: [],
    statuses: [],
    studios: [],
  });
  const [titlePreference, setTitlePreference] = useState<TitlePreference>('en');
  const hasRestoredRouteRef = useRef(false);

  const buildAppUrl = useCallback(
    (view: AppView, anime: Anime | null, episode: number, searchQuery: string) => {
      const params = new URLSearchParams();

      switch (view) {
        case 'detail':
          if (anime) {
            params.set('view', 'detail');
            params.set('id', buildAnimeLookupId(anime));
          }
          break;
        case 'watch':
          if (anime) {
            params.set('view', 'watch');
            params.set('id', buildAnimeLookupId(anime));
            params.set('episode', String(Math.max(1, episode)));
          }
          break;
        case 'search':
          params.set('view', 'search');
          if (searchQuery.trim()) {
            params.set('q', searchQuery.trim());
          }
          break;
        case 'schedule':
          params.set('view', 'schedule');
          break;
        case 'settings':
          params.set('view', 'settings');
          break;
        default:
          break;
      }

      const query = params.toString();
      return `${window.location.pathname}${query ? `?${query}` : ''}`;
    },
    []
  );

  const restoreRouteState = useCallback(async () => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const id = params.get('id');
    const query = params.get('q') ?? '';
    const episode = Math.max(1, Number.parseInt(params.get('episode') ?? '1', 10) || 1);

    if (view === 'search') {
      setSearchPageInitialQuery(query);
      setCurrentView('search');
      setSelectedAnime(null);
      return;
    }

    if (view === 'schedule') {
      setCurrentView('schedule');
      setSelectedAnime(null);
      return;
    }

    if (view === 'settings') {
      setCurrentView('settings');
      setSelectedAnime(null);
      return;
    }

    if ((view === 'detail' || view === 'watch') && id) {
      try {
        const resolvedAnime = await fetchAnimeById(id);
        let hydratedAnime = resolvedAnime;
        let nextView: AppView = view;

        if (view === 'watch') {
          const payload = await fetchAnimeWatchPayload(resolvedAnime, episode).catch(() => null);
          logWatchPayloadResult('restore-route', resolvedAnime.title, episode, payload);
          if (!payload || !hasPlayableWatchPayload(payload)) {
            console.warn(
              `[watch-ui] restore fallback | anime="${resolvedAnime.title}" | episode=${episode} | reason=no-playable-sources`
            );
          } else {
            hydratedAnime = hydrateAnimeWithWatchPayload(resolvedAnime, payload);
          }
        }

        setSelectedAnime(hydratedAnime);
        setWatchEpisode(episode);
        setCurrentView(nextView);
        return;
      } catch {
        setSelectedAnime(null);
        setCurrentView('home');
        return;
      }
    }

    setSelectedAnime(null);
    setCurrentView('home');
  }, []);

  useEffect(() => {
    const stored = window.localStorage.getItem(TITLE_PREFERENCE_STORAGE_KEY);
    if (stored === 'en' || stored === 'jp') {
      setTitlePreference(stored);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(TITLE_PREFERENCE_STORAGE_KEY, titlePreference);
  }, [titlePreference]);

  useEffect(() => {
    const readCachedFacets = () => {
      try {
        const raw = window.sessionStorage.getItem(SEARCH_FACETS_CACHE_KEY);
        if (!raw) {
          return null;
        }

        const parsed = JSON.parse(raw) as {
          expiresAt?: number;
          value?: SearchFacets;
        };

        if (!parsed.value || !parsed.expiresAt || parsed.expiresAt <= Date.now()) {
          window.sessionStorage.removeItem(SEARCH_FACETS_CACHE_KEY);
          return null;
        }

        return parsed.value;
      } catch {
        return null;
      }
    };

    const cached = readCachedFacets();
    if (cached) {
      setSearchFacets(cached);
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const payload = await fetchAnimeSearchFacets();
        if (isCancelled) {
          return;
        }

        setSearchFacets(payload.facets);
        window.sessionStorage.setItem(
          SEARCH_FACETS_CACHE_KEY,
          JSON.stringify({
            expiresAt: Date.now() + SEARCH_FACETS_CACHE_TTL_MS,
            value: payload.facets,
          })
        );
      } catch {
        // Leave empty facets state if the preload request fails.
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    void restoreRouteState().finally(() => {
      hasRestoredRouteRef.current = true;
      setIsRouteReady(true);
    });

    const handlePopState = () => {
      void restoreRouteState();
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [restoreRouteState]);

  useEffect(() => {
    if (!hasRestoredRouteRef.current) {
      return;
    }

    const nextUrl = buildAppUrl(currentView, selectedAnime, watchEpisode, searchPageInitialQuery);
    const currentUrl = `${window.location.pathname}${window.location.search}`;

    if (nextUrl !== currentUrl) {
      window.history.replaceState(null, '', nextUrl);
    }
  }, [buildAppUrl, currentView, searchPageInitialQuery, selectedAnime, watchEpisode]);

  const handleAnimeClick = useCallback(async (anime: Anime) => {
    setSelectedAnime(anime);
    setCurrentView('detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const resolvedAnime = await fetchAnimeById(anime.id);
      setSelectedAnime(resolvedAnime);
    } catch {
      // Keep the optimistic data if database-backed details fail to load.
    }
  }, []);

  const handleWatchClick = useCallback(async (anime: Anime, episode?: number) => {
    const nextEpisode = episode || 1;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    try {
      const resolvedAnime = await fetchAnimeById(buildAnimeLookupId(anime));
      const payload = await fetchAnimeWatchPayload(resolvedAnime, nextEpisode).catch(() => null);
      logWatchPayloadResult('watch-click', resolvedAnime.title, nextEpisode, payload);

      if (!payload || !hasPlayableWatchPayload(payload)) {
        console.warn(
          `[watch-ui] watch fallback | anime="${resolvedAnime.title}" | episode=${nextEpisode} | reason=no-playable-sources`
        );
        setSelectedAnime(resolvedAnime);
      } else {
        const hydratedAnime = hydrateAnimeWithWatchPayload(resolvedAnime, payload);
        setSelectedAnime(hydratedAnime);
      }
    } catch {
      setSelectedAnime(anime);
    }

    setWatchEpisode(nextEpisode);
    setCurrentView('watch');
  }, []);

  const openQuickSearch = useCallback(() => {
    setIsQuickSearchOpen(true);
  }, []);

  const closeQuickSearch = useCallback(() => {
    setIsQuickSearchOpen(false);
  }, []);

  const handleLogoClick = useCallback(() => {
    setCurrentView('home');
    setSelectedAnime(null);
    setSearchPageInitialQuery('');
    setWatchEpisode(1);
    setIsQuickSearchOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleGridItemClick = (item: AnimeGridItem) => {
    const matched = homeData.featuredAnime.find((a) => a.id === item.id);
    if (matched) {
      void handleAnimeClick(matched);
      return;
    }

    const anime: Anime = {
      id: item.id,
      title: item.title,
      englishTitle: item.englishTitle,
      romajiTitle: item.romajiTitle,
      nativeTitle: item.nativeTitle,
      description: '',
      carouselImage: '',
      coverImage: item.thumbnail,
      score: item.score,
      format: item.format,
      year: 2026,
      episodes: item.totalEpisodes || undefined,
      genre: [],
    };

    void handleAnimeClick(anime);
  };

  const handleSearchItemClick = (item: SearchAnimeItem) => {
    const matched = homeData.featuredAnime.find((a) => a.id === item.id);
    if (matched) {
      closeQuickSearch();
      void handleAnimeClick(matched);
      return;
    }

    const anime: Anime = {
      id: item.id,
      title: item.title,
      englishTitle: item.englishTitle,
      romajiTitle: item.romajiTitle,
      nativeTitle: item.nativeTitle,
      description: '',
      carouselImage: '',
      coverImage: item.coverImage,
      score: item.score,
      format: item.format,
      year: item.year,
      episodes: item.episodes,
      genre: item.genre,
      status: item.status,
      season: item.season,
      studios: item.studios,
    };

    closeQuickSearch();
    void handleAnimeClick(anime);
  };

  const handleTrendingClick = (item: TrendingItem) => {
    const matched = homeData.featuredAnime.find((a) => a.id === item.id);
    if (matched) {
      void handleAnimeClick(matched);
      return;
    }

    const anime: Anime = {
      id: item.id,
      title: item.title,
      englishTitle: item.englishTitle,
      romajiTitle: item.romajiTitle,
      nativeTitle: item.nativeTitle,
      description: '',
      carouselImage: '',
      coverImage: item.coverImage,
      score: item.score,
      format: item.format,
      year: 2026,
      genre: [],
    };

    void handleAnimeClick(anime);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isSearchShortcut =
        event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        event.key.toLowerCase() === 's';

      if (!isSearchShortcut) {
        return;
      }

      event.preventDefault();
      setIsQuickSearchOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasHomeContent =
    homeData.featuredAnime.length > 0 ||
    homeData.latestEpisodes.length > 0 ||
    homeData.newOnSite.length > 0 ||
    homeData.upcomingAnime.length > 0 ||
    homeData.trendingAnime.length > 0;

  if (!isRouteReady) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-black text-white">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-black text-white">
      <Header
        onLogoClick={handleLogoClick}
        onSearchClick={openQuickSearch}
        titlePreference={titlePreference}
        onTitlePreferenceChange={setTitlePreference}
      />
      <SideDock
        activeView={currentView}
        onViewChange={(view) => setCurrentView(view as AppView)}
      />

      <QuickSearchModal
        isOpen={isQuickSearchOpen}
        onClose={closeQuickSearch}
        onAnimeClick={handleSearchItemClick}
        titlePreference={titlePreference}
        onViewAll={(query) => {
          setSearchPageInitialQuery(query);
          setCurrentView('search');
        }}
      />

      <main className="flex-1 pt-16 pb-20 lg:pb-0">
        <AnimatePresence mode="wait">
          {currentView === 'watch' && selectedAnime ? (
            <motion.div
              key="watch"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AnimeWatchPage
                key={`${selectedAnime.id}-${watchEpisode}`}
                anime={selectedAnime}
                initialEpisode={watchEpisode}
                onBack={() => setCurrentView('detail')}
                onAnimeDetails={(anime) => void handleAnimeClick(anime)}
              />
            </motion.div>
          ) : currentView === 'detail' && selectedAnime ? (
            <motion.div
              key="detail"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <AnimeDetailPage
                anime={selectedAnime}
                titlePreference={titlePreference}
                onBack={() => setCurrentView('home')}
                onWatchNow={(ep) => void handleWatchClick(selectedAnime, ep)}
                onAnimeSelect={(nextAnime) => void handleAnimeClick(nextAnime)}
              />
            </motion.div>
          ) : currentView === 'home' ? (
            <motion.div
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="-mt-16 text-white">
                {homeData.featuredAnime.length > 0 ? (
                  <HeroCarousel
                    animeList={homeData.featuredAnime}
                    titlePreference={titlePreference}
                    onAnimeClick={(anime) => void handleAnimeClick(anime)}
                    onWatchNow={(anime) => void handleWatchClick(anime)}
                  />
                ) : (
                  <div className="relative h-[70vh] w-full overflow-hidden rounded-b-[2rem] bg-[#0d0d15] sm:h-[60vh] lg:h-[70vh]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_35%)]" />
                    <div className="absolute inset-0 animate-pulse bg-gradient-to-b from-white/[0.03] via-transparent to-black/40" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 px-4 sm:px-6 lg:grid-cols-12">
                <div className="space-y-8 lg:col-span-8 xl:col-span-9">
                  <LatestEpisodesGrid
                    episodes={homeData.latestEpisodes}
                    titlePreference={titlePreference}
                    onAnimeClick={handleGridItemClick}
                  />

                  <PortraitGridSection
                    title="New on Site"
                    icon={Star}
                    animeList={homeData.newOnSite}
                    titlePreference={titlePreference}
                    onAnimeClick={(anime) => void handleAnimeClick(anime)}
                  />

                  <PortraitGridSection
                    title="Upcoming"
                    icon={Calendar}
                    animeList={homeData.upcomingAnime}
                    titlePreference={titlePreference}
                    onAnimeClick={(anime) => void handleAnimeClick(anime)}
                  />
                </div>

                <div className="lg:col-span-4 xl:col-span-3">
                  <ScheduleSection
                    items={homeData.trendingAnime}
                    titlePreference={titlePreference}
                    onAnimeClick={handleTrendingClick}
                  />
                </div>
              </div>
            </motion.div>
          ) : currentView === 'search' ? (
            <motion.div
              key="search"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SearchPage
                key={searchPageInitialQuery || 'search'}
                onClose={() => setCurrentView('home')}
                onAnimeClick={handleSearchItemClick}
                initialQuery={searchPageInitialQuery}
                initialFacets={searchFacets}
                titlePreference={titlePreference}
              />
            </motion.div>
          ) : currentView === 'schedule' ? (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SchedulePage
                titlePreference={titlePreference}
                onAnimeClick={(item) => {
                  const matched = homeData.featuredAnime.find((a) => a.id === item.id);
                  if (matched) {
                    void handleAnimeClick(matched);
                    return;
                  }

                  const anime: Anime = {
                    id: item.id,
                    title: item.title,
                    englishTitle: item.englishTitle,
                    romajiTitle: item.romajiTitle,
                    nativeTitle: item.nativeTitle,
                    description: item.description || '',
                    carouselImage: '',
                    coverImage: item.coverImage,
                    score: 0,
                    format: 'TV',
                    year: 2026,
                    genre: item.genre,
                  };

                  void handleAnimeClick(anime);
                }}
              />
            </motion.div>
          ) : (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SettingsPage />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <MobileNav
        activeView={currentView}
        onViewChange={(view) => setCurrentView(view as AppView)}
      />
    </div>
  );
}
