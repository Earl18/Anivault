'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Play,
  Maximize,
  MonitorPlay,
  SkipForward,
  SkipBack,
  Star,
  Subtitles,
  Mic,
  Search,
  LayoutGrid,
  Volume2,
  Settings,
} from 'lucide-react';
import type { Anime, AnimeEpisodeSource } from '@/lib/anime-data';
import { fetchAnimeWatchPayload, type WatchEpisodePayload } from '@/lib/anime-client';

interface WatchEpisode {
  number: number;
  title: string;
  airedAt: string;
  isAired: boolean;
  thumbnail?: string;
  streams?: AnimeEpisodeSource[];
  downloads?: AnimeEpisodeSource[];
}

interface ServerOption {
  id: string;
  name: string;
  provider: string;
  lang: 'sub' | 'dub';
  url?: string;
  type?: 'embed' | 'stream' | 'download';
}

function mapAnimeEpisodes(anime: Anime): WatchEpisode[] {
  if (!anime.episodeList || anime.episodeList.length === 0) {
    return [];
  }

  return anime.episodeList.map((episode) => ({
    number: episode.number,
    title: episode.title || `Episode ${episode.number}`,
    airedAt: episode.airedAt ?? '',
    isAired: episode.isAired,
    thumbnail: episode.thumbnail || anime.coverImage,
    streams: episode.sources,
    downloads: episode.downloads,
  }));
}

function useCountdown(targetDate: Date | null) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = targetDate.getTime() - now;
      if (distance < 0) {
        clearInterval(timer);
        return;
      }
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return timeLeft;
}

function stripHtml(value?: string) {
  if (!value) return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getAltTitle(anime: Anime) {
  return anime.englishTitle || anime.romajiTitle || anime.nativeTitle || '';
}

function formatScore(score?: number) {
  if (!score && score !== 0) return '?';
  return score.toFixed(1);
}

function parseValidDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getSourcePriority(type?: ServerOption['type']) {
  if (type === 'stream') {
    return 0;
  }

  if (type === 'embed') {
    return 1;
  }

  return 2;
}

function getSourceQualityScore(label?: string) {
  if (!label) {
    return 0;
  }

  const match = label.match(/(\d{3,4})/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

function formatProviderName(provider: string) {
  switch (provider.toLowerCase()) {
    case 'animepahe':
      return 'AnimePahe';
    case 'anikoto':
      return 'Anikoto';
    default:
      return provider;
  }
}

function chooseBestSource(sources: AnimeEpisodeSource[]) {
  return [...sources].sort((left, right) => {
    const priorityDelta = getSourcePriority(left.type) - getSourcePriority(right.type);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return getSourceQualityScore(right.label) - getSourceQualityScore(left.label);
  })[0] ?? null;
}

function pickPreferredServer(
  servers: ServerOption[],
  preferredLanguage: 'sub' | 'dub'
) {
  const ranked = [...servers].sort((left, right) => {
    const languageDelta =
      Number(left.lang !== preferredLanguage) - Number(right.lang !== preferredLanguage);

    if (languageDelta !== 0) {
      return languageDelta;
    }

    return getSourcePriority(left.type) - getSourcePriority(right.type);
  });

  return ranked[0] ?? null;
}

function mergeEpisodes(baseEpisodes: WatchEpisode[], overrideEpisodes: WatchEpisodePayload[]) {
  if (overrideEpisodes.length === 0) {
    return baseEpisodes;
  }

  const baseMap = new Map(baseEpisodes.map((episode) => [episode.number, episode]));

  return overrideEpisodes.map((episode) => {
    const baseEpisode = baseMap.get(episode.number);
    return {
      number: episode.number,
      title: episode.title || baseEpisode?.title || `Episode ${episode.number}`,
      airedAt: episode.airedAt ?? baseEpisode?.airedAt ?? '',
      isAired: episode.isAired ?? baseEpisode?.isAired ?? true,
      thumbnail: episode.thumbnail || baseEpisode?.thumbnail,
      streams: episode.sources.length > 0 ? episode.sources : baseEpisode?.streams,
      downloads: episode.downloads.length > 0 ? episode.downloads : baseEpisode?.downloads,
    } satisfies WatchEpisode;
  });
}

function useResolvedStreamUrl(server: ServerOption | null) {
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [resolveError, setResolveError] = useState<string | null>(null);

  useEffect(() => {
    if (!server?.url) {
      setResolvedUrl(null);
      setResolveError(null);
      return;
    }

    // Route through proxy so the server adds Referer: kwik.cx for the CDN
    if (server.type === 'stream') {
      setResolvedUrl(`/api/anime/stream-proxy?url=${encodeURIComponent(server.url)}`);
      setResolveError(null);
      return;
    }

    // Embed URL (e.g. kwik.cx) — resolve via server-side proxy so we get the
    // real .m3u8 URL. kwik.cx refuses to be iframed (X-Frame-Options: DENY).
    let cancelled = false;
    setIsResolving(true);
    setResolvedUrl(null);
    setResolveError(null);

    fetch(`/api/anime/stream-proxy?url=${encodeURIComponent(server.url)}`)
      .then((res) => res.json())
      .then((data: { url?: string; message?: string }) => {
        if (cancelled) return;
        if (data.url) {
          setResolvedUrl(data.url);
        } else {
          setResolveError(data.message ?? 'Could not resolve stream.');
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setResolveError(err instanceof Error ? err.message : 'Stream proxy error.');
      })
      .finally(() => {
        if (!cancelled) setIsResolving(false);
      });

    return () => { cancelled = true; };
  }, [server?.url, server?.type]);

  return { resolvedUrl, isResolving, resolveError };
}

function VideoPlayer({
  animeTitle,
  episodeNumber,
  server,
  className,
}: {
  animeTitle: string;
  episodeNumber: number;
  server: ServerOption | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { resolvedUrl, isResolving, resolveError } = useResolvedStreamUrl(server);

  useEffect(() => {
    if (!resolvedUrl) return;

    const video = videoRef.current;
    if (!video) return;

    // Safari / iOS — native HLS support
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = resolvedUrl;
      return;
    }

    let disposed = false;
    let hlsInstance: { destroy?: () => void; loadSource?: (src: string) => void; attachMedia?: (media: HTMLMediaElement) => void } | null = null;

    const setupHls = async () => {
      const existingHls = (window as Window & { Hls?: any }).Hls;
      const HlsCtor =
        existingHls ??
        (await new Promise<any>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/hls.js@latest';
          script.async = true;
          script.onload = () => resolve((window as Window & { Hls?: any }).Hls);
          script.onerror = () => reject(new Error('Failed to load HLS player.'));
          document.head.appendChild(script);
        }));

      if (disposed || !HlsCtor) return;

      if (typeof HlsCtor.isSupported === 'function' && !HlsCtor.isSupported()) {
        video.src = resolvedUrl;
        return;
      }
      
      hlsInstance = new HlsCtor();
      hlsInstance?.loadSource?.(resolvedUrl);
      hlsInstance?.attachMedia?.(video);
    };

    void setupHls().catch(() => {
      if (video) video.src = resolvedUrl;
    });

    return () => {
      disposed = true;
      hlsInstance?.destroy?.();
    };
  }, [resolvedUrl]);

  if (!server?.url) return null;

  // Loading state while proxy resolves
  if (isResolving) {
    return (
      <div className={className ?? 'absolute inset-0 h-full w-full'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
            <path d="M4 12a8 8 0 0 1 8-8" strokeLinecap="round" />
          </svg>
          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>Resolving stream...</span>
        </div>
      </div>
    );
  }

  if (resolveError && !resolvedUrl) {
    return (
      <div className={className ?? 'absolute inset-0 h-full w-full'} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', maxWidth: '320px', textAlign: 'center', padding: '0 16px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Stream unavailable</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{resolveError}</span>
        </div>
      </div>
    );
  }

  return (
    <video
      key={resolvedUrl ?? server.url}
      ref={videoRef}
      className={className ?? 'absolute inset-0 h-full w-full'}
      controls
      autoPlay
      playsInline
      crossOrigin="anonymous"
      title={`${animeTitle} Episode ${episodeNumber}`}
    />
  );
}

export function AnimeWatchPage({
  anime,
  initialEpisode = 1,
  onBack,
  onAnimeDetails,
}: {
  anime: Anime;
  initialEpisode?: number;
  onBack?: () => void;
  onAnimeDetails?: (anime: Anime) => void;
}) {
  const baseEpisodes = useMemo(() => mapAnimeEpisodes(anime), [anime]);
  const [currentEpisode, setCurrentEpisode] = useState(initialEpisode);
  const [selectedServer, setSelectedServer] = useState('');
  const [selectedLang, setSelectedLang] = useState<'sub' | 'dub'>('sub');
  const [autoPlay, setAutoPlay] = useState(true);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSkip, setAutoSkip] = useState(false);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeViewMode, setEpisodeViewMode] = useState<'grid' | 'list'>('list');
  const [remoteEpisodes, setRemoteEpisodes] = useState<WatchEpisodePayload[]>([]);
  const [streamProvider, setStreamProvider] = useState<'anikoto' | 'animepahe' | null>(null);
  const [isStreamLoading, setIsStreamLoading] = useState(false);

  const episodes = useMemo(
    () => mergeEpisodes(baseEpisodes, remoteEpisodes),
    [baseEpisodes, remoteEpisodes]
  );
  const totalEpisodes = episodes.length;
  const currentEpData = episodes.find((ep) => ep.number === currentEpisode);
  const providerServers = useMemo(() => {
    const streams = currentEpData?.streams ?? [];
    const grouped = new Map<string, AnimeEpisodeSource[]>();

    for (const stream of streams) {
      const key = `${stream.provider}:${stream.language}`;
      grouped.set(key, [...(grouped.get(key) ?? []), stream]);
    }

    return [...grouped.entries()]
      .map(([key, group]) => {
        const bestSource = chooseBestSource(group);
        if (!bestSource) {
          return null;
        }

        const [provider, language] = key.split(':');
        return {
          id: `${provider}-${language}`,
          name: formatProviderName(provider),
          provider,
          lang: language as 'sub' | 'dub',
          url: bestSource.url,
          type: bestSource.type,
        } satisfies ServerOption;
      })
      .filter(Boolean) as ServerOption[];
  }, [currentEpData]);

  const availableServers = providerServers;
  const subServers = availableServers.filter((s) => s.lang === 'sub');
  const dubServers = availableServers.filter((s) => s.lang === 'dub');
  const selectedServerData =
    availableServers.find((server) => server.id === selectedServer) ??
    (selectedLang === 'dub' ? dubServers[0] : subServers[0]) ??
    availableServers[0] ??
    null;
  const activeServerId = selectedServerData?.id ?? selectedServer;
  const activeLang = selectedServerData?.lang ?? selectedLang;

  useEffect(() => {
    let cancelled = false;

    async function loadWatchPayload() {
      setIsStreamLoading(true);

      try {
        const payload = await fetchAnimeWatchPayload(anime, currentEpisode);
        if (cancelled) {
          return;
        }

        setRemoteEpisodes(payload.episodes);
        setStreamProvider(payload.provider);
        if (payload.selectedEpisode?.sources?.length) {
          const preferredSource = pickPreferredServer(
            (() => {
              const grouped = new Map<string, AnimeEpisodeSource[]>();
              for (const source of payload.selectedEpisode.sources) {
                const key = `${source.provider}:${source.language}`;
                grouped.set(key, [...(grouped.get(key) ?? []), source]);
              }

              return [...grouped.entries()]
                .map(([key, group]) => {
                  const bestSource = chooseBestSource(group);
                  if (!bestSource) {
                    return null;
                  }

                  const [provider, language] = key.split(':');
                  return {
                    id: `${provider}-${language}`,
                    name: formatProviderName(provider),
                    provider,
                    lang: language as 'sub' | 'dub',
                    url: bestSource.url,
                    type: bestSource.type,
                  } satisfies ServerOption;
                })
                .filter(Boolean) as ServerOption[];
            })(),
            selectedLang
          );

          if (preferredSource?.id) {
            setSelectedServer(
              preferredSource.id
            );
            setSelectedLang(preferredSource.lang);
          }
        }
      } catch {
        if (!cancelled) {
          setRemoteEpisodes([]);
          setStreamProvider(null);
        }
      } finally {
        if (!cancelled) {
          setIsStreamLoading(false);
        }
      }
    }

    void loadWatchPayload();

    return () => {
      cancelled = true;
    };
  }, [anime, currentEpisode]);

  const animeStatus = anime.status || 'Unknown';
  const statusValue = animeStatus.toLowerCase();
  const statusColor =
    statusValue.includes('air') || statusValue.includes('releas')
      ? 'text-primary'
      : statusValue.includes('finished') || statusValue.includes('complete')
        ? 'text-blue-400'
        : 'text-yellow-400';
  const statusDot =
    statusValue.includes('air') || statusValue.includes('releas')
      ? 'bg-primary'
      : statusValue.includes('finished') || statusValue.includes('complete')
        ? 'bg-blue-400'
        : 'bg-yellow-400';

  const nextUnairedEp = episodes.find((ep) => !ep.isAired && parseValidDate(ep.airedAt));
  const nextEpDate = nextUnairedEp ? parseValidDate(nextUnairedEp.airedAt) : null;
  const countdown = useCountdown(nextEpDate);

  const filteredEpisodes = episodes.filter(
    (ep) =>
      ep.title.toLowerCase().includes(episodeSearch.toLowerCase()) ||
      ep.number.toString().includes(episodeSearch)
  );

  const handleEpisodeClick = useCallback((epNumber: number) => {
    setCurrentEpisode(epNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const backdropImage = anime.carouselImage || anime.coverImage;
  const synopsis = stripHtml(anime.description) || 'No synopsis available.';
  const altTitle = getAltTitle(anime);
  const dbSubbedCount = anime.subbed ?? anime.airedSubEpisodes ?? 0;
  const dbDubbedCount = anime.dubbed ?? anime.airedDubEpisodes ?? 0;

  return (
    <div className="min-h-[calc(100dvh-4rem)]">
      <div className="lg:hidden">
        <div className="relative w-full aspect-video overflow-hidden bg-[#0a0a0a]">
          {selectedServerData?.url ? (
            <VideoPlayer
              animeTitle={anime.title}
              episodeNumber={currentEpisode}
              server={selectedServerData}
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-950 to-black">
              {backdropImage && (
                <img src={backdropImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm" />
              )}
              <div className="absolute inset-0 bg-black/60" />
              <div className="relative z-10 flex max-w-md flex-col items-center gap-3 px-6 text-center">
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">
                  {isStreamLoading ? 'Loading' : 'Unavailable'}
                </div>
                <p className="text-sm font-semibold text-white">
                  {isStreamLoading ? 'Fetching streaming provider...' : 'No streaming video available for this episode yet.'}
                </p>
                <p className="text-xs text-white/45">
                  {anime.title} Episode {currentEpisode}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto px-8 py-4 sm:px-12">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="hidden w-[clamp(220px,20vw,320px)] shrink-0 self-stretch lg:block">
            <div className="sticky top-20 h-[calc(100vh-6rem)]">
              <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-white/5 shadow-xl">
                <div
                  className="absolute inset-x-0 top-0 z-0 h-[320px] scale-110 bg-cover bg-center bg-no-repeat opacity-40 blur-[16px]"
                  style={{ backgroundImage: `url('${anime.coverImage}')` }}
                />
                <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#0f0f0f]/30 via-[#0f0f0f]/95 to-[#0f0f0f]" />

                <div className="relative z-10 flex h-full min-h-0 w-full flex-col gap-4 p-5">
                  <div className="relative z-10 flex flex-col items-center gap-4">
                    <div className="relative aspect-[2/3] w-full max-w-[200px] overflow-hidden rounded-lg border border-white/10 shadow-2xl">
                      <img
                        src={anime.coverImage}
                        alt={anime.title}
                        className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                        loading="lazy"
                      />
                    </div>

                    <div className="w-full text-center">
                      <h2 className="line-clamp-2 text-xl leading-tight font-bold text-white" title={anime.title}>
                        {anime.title}
                      </h2>
                      {altTitle ? (
                        <h3 className="mt-1.5 line-clamp-2 text-xs font-medium text-zinc-400">{altTitle}</h3>
                      ) : null}
                    </div>
                  </div>

                  <div className="relative z-10 flex flex-wrap justify-center gap-2 border-b border-white/5 pb-4">
                    <div className="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black">
                      <div className="absolute right-0 top-0 h-full w-1 bg-white/10" />
                      <div className="relative z-10 flex skew-x-12 items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
                        <Subtitles className="size-3.5" />
                        <span>{dbSubbedCount}</span>
                      </div>
                    </div>

                    <div className="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black">
                      <div className="absolute right-0 top-0 h-full w-1 bg-white/10" />
                      <div className="relative z-10 flex skew-x-12 items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-primary">
                        <Mic className="size-3.5" />
                        <span>{dbDubbedCount}</span>
                      </div>
                    </div>

                    <div className="relative flex -skew-x-12 items-center justify-center border border-white/10 bg-black/80 px-3 py-1 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/50 hover:bg-black">
                      <div className="absolute right-0 top-0 h-full w-1 bg-white/10" />
                      <div className={`relative z-10 flex skew-x-12 items-center justify-center text-[11px] font-black uppercase tracking-wider ${statusColor}`}>
                        {animeStatus}
                      </div>
                    </div>
                  </div>

                  {streamProvider ? (
                    <div className="relative z-10 -mt-1 text-center text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/70">
                      Stream source: {streamProvider}
                    </div>
                  ) : null}

                  <div className="relative z-10 text-[13px] font-medium leading-relaxed tracking-wide text-zinc-200/90">
                    {anime.description ? (
                      <p className="line-clamp-4" dangerouslySetInnerHTML={{ __html: anime.description }} />
                    ) : (
                      'No synopsis available.'
                    )}
                  </div>

                  <div className="relative z-10 mt-auto flex flex-col gap-2.5 border-t border-white/5 pt-4 text-[13px]">
                    {anime.startDate ? (
                      <div className="flex gap-2">
                        <span className="w-[70px] shrink-0 font-medium text-zinc-500">Start Date:</span>
                        <span className="truncate text-zinc-200">{anime.startDate}</span>
                      </div>
                    ) : null}
                    {anime.genre.length > 0 ? (
                      <div className="flex gap-2">
                        <span className="w-[70px] shrink-0 font-medium text-zinc-500">Genres:</span>
                        <span className="line-clamp-2 text-zinc-200">{anime.genre.join(', ')}</span>
                      </div>
                    ) : null}
                    {anime.season && anime.year ? (
                      <div className="flex gap-2">
                        <span className="w-[70px] shrink-0 font-medium text-zinc-500">Premiered:</span>
                        <span className="truncate capitalize text-zinc-200">{anime.season} {anime.year}</span>
                      </div>
                    ) : null}
                    {anime.duration ? (
                      <div className="flex gap-2">
                        <span className="w-[70px] shrink-0 font-medium text-zinc-500">Duration:</span>
                        <span className="truncate text-zinc-200">{anime.duration} min</span>
                      </div>
                    ) : null}
                    <div className="flex gap-2">
                      <span className="w-[70px] shrink-0 font-medium text-zinc-500">Score:</span>
                      <span className="truncate text-zinc-200">{formatScore(anime.score)}</span>
                    </div>
                    {anime.studios && anime.studios.length > 0 ? (
                      <div className="flex gap-2">
                        <span className="w-[70px] shrink-0 font-medium text-zinc-500">Studios:</span>
                        <span className="truncate text-zinc-200">{anime.studios.join(', ')}</span>
                      </div>
                    ) : null}
                  </div>

                  {onAnimeDetails ? (
                    <button
                      onClick={() => onAnimeDetails(anime)}
                      className="group relative z-10 mx-auto mt-3 flex h-10 w-[98%] items-center justify-center overflow-hidden border border-white/10 bg-white/5 transition-all duration-300 hover:border-white/20 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-95"
                      style={{ transform: 'skew(-10deg)' }}
                    >
                      <div className="flex flex-row items-center justify-center gap-2" style={{ transform: 'skew(10deg)' }}>
                        <span className="relative z-10 text-[11px] font-bold uppercase tracking-widest text-zinc-300 transition-colors group-hover:text-white">
                          View Details
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="relative z-10 h-3.5 w-3.5 text-zinc-400 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6" />
                        </svg>
                      </div>
                      <div className="absolute inset-0 -translate-x-[150%] bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-[150%]" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-5">
            <div className="hidden lg:block">
              <div className="relative w-full aspect-video overflow-hidden rounded-lg bg-[#0a0a0a]">
                {selectedServerData?.url ? (
                  <VideoPlayer
                    animeTitle={anime.title}
                    episodeNumber={currentEpisode}
                    server={selectedServerData}
                    className="absolute inset-0 h-full w-full"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-950 to-black">
                    {backdropImage ? (
                      <img src={backdropImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm" />
                    ) : null}
                    <div className="absolute inset-0 bg-black/60" />

                    <div className="relative z-10 flex max-w-lg flex-col items-center gap-4 px-8 text-center">
                      <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/60">
                        {isStreamLoading ? 'Loading stream' : 'Stream unavailable'}
                      </div>
                      <div className="text-center">
                        <p className="text-lg font-semibold text-white">
                          {isStreamLoading ? 'Fetching real streaming video...' : 'No real streaming video is available for this episode yet.'}
                        </p>
                        <p className="mt-2 text-sm text-white/45">{anime.title} Episode {currentEpisode}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex w-full flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex items-center gap-2 rounded-full bg-[#141414] px-3 py-1.5">
                <svg className="h-3 w-3 animate-spin text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 0 1 8-8" strokeLinecap="round" />
                </svg>
                <span className="text-xs sm:text-sm">Syncing...</span>
              </div>

              <div className="flex flex-row flex-wrap items-center justify-end gap-1 sm:gap-1.5 md:gap-2 xl:flex-nowrap xl:gap-1.5 2xl:gap-3">
                <button className="flex items-center justify-center gap-1 rounded-md bg-[#141414] px-2 py-1 text-white/50 transition-colors hover:bg-[#1a1a1a] hover:text-white sm:px-2.5 xl:px-2.5 2xl:px-3">
                  <MonitorPlay className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span className="hidden text-[11px] font-semibold uppercase leading-none tracking-tight 2xl:inline 2xl:text-[0.75rem]">Theater</span>
                </button>

                <button
                  onClick={() => setAutoPlay(!autoPlay)}
                  className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 ${autoPlay ? 'bg-[#141414] text-primary' : 'bg-[#141414] text-white/50 hover:bg-[#1a1a1a] hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 0 1 0 1.971l-11.54 6.347a1.125 1.125 0 0 1-1.667-.985V5.653z" />
                  </svg>
                  <span className="hidden text-[11px] font-semibold uppercase leading-none tracking-tight 2xl:inline 2xl:text-[0.75rem]">Auto Play</span>
                </button>

                <button
                  onClick={() => setAutoNext(!autoNext)}
                  className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 ${autoNext ? 'bg-[#141414] text-primary' : 'bg-[#141414] text-white/50 hover:bg-[#1a1a1a] hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5v14l12-7L3 5zM21 5v14" />
                  </svg>
                  <span className="hidden text-[11px] font-semibold uppercase leading-none tracking-tight 2xl:inline 2xl:text-[0.75rem]">Auto Next</span>
                </button>

                <button
                  onClick={() => setAutoSkip(!autoSkip)}
                  className={`flex items-center justify-center gap-1 rounded-md px-2 py-1 transition-colors sm:px-2.5 xl:px-2.5 2xl:px-3 ${autoSkip ? 'bg-[#141414] text-primary' : 'bg-[#141414] text-white/50 hover:bg-[#1a1a1a] hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24" fill="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path d="M760-120 480-400l-94 94q8 15 11 32t3 34q0 66-47 113T240-80q-66 0-113-47T80-240q0-66 47-113t113-47q17 0 34 3t32 11l94-94-94-94q-15 8-32 11t-34 3q-66 0-113-47T80-720q0-66 47-113t113-47q66 0 113 47t47 113q0 17-3 34t-11 32l494 494v40H760ZM600-520l-80-80 240-240h120v40L600-520ZM240-640q33 0 56.5-23.5T320-720q0-33-23.5-56.5T240-800q-33 0-56.5 23.5T160-720q0 33 23.5 56.5T240-640Zm240 180q8 0 14-6t6-14q0-8-6-14t-14-6q-8 0-14 6t-6 14q0 8 6 14t14 6ZM240-160q33 0 56.5-23.5T320-240q0-33-23.5-56.5T240-320q-33 0-56.5 23.5T160-240q0 33 23.5 56.5T240-160Z" />
                  </svg>
                  <span className="hidden text-[11px] font-semibold uppercase leading-none tracking-tight 2xl:inline 2xl:text-[0.75rem]">Auto Skip</span>
                </button>

                <button className="flex items-center justify-center gap-1 rounded-md bg-[#141414] px-2 py-1 text-white/50 transition-colors hover:bg-[#1a1a1a] hover:text-white sm:px-2.5 xl:px-2.5 2xl:px-3">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="h-3.5 w-3.5 sm:h-4 sm:w-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
                  </svg>
                  <span className="hidden text-[11px] font-semibold uppercase leading-none tracking-tight 2xl:inline 2xl:text-[0.75rem]">Add to List</span>
                </button>
              </div>
            </div>

            <div className="my-3 border-t border-solid border-gray-300/10" />

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:gap-2">
              <div className="hidden flex-col items-center justify-center xl:flex xl:w-2/6">
                <span className="text-xs text-zinc-400 xl:text-sm">You are Watching</span>
                <span className="mt-0.5 text-sm font-medium text-white">Episode {currentEpisode}</span>
              </div>

              <div className="flex w-full flex-col justify-center gap-2.5 md:w-fit md:flex-shrink-0 lg:px-6 xl:px-8">
                <div className="flex w-full flex-row items-center gap-3">
                  <span className="flex min-w-[65px] flex-row items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-400">
                    <Subtitles className="h-4 w-4" />
                    SUB:
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {subServers.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => {
                          setSelectedServer(server.id);
                          setSelectedLang('sub');
                        }}
                        className={`cursor-pointer rounded-md border px-5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                          activeServerId === server.id && activeLang === 'sub'
                            ? 'border-primary/50 bg-primary text-black shadow-md'
                            : 'border-white/5 bg-white/[0.06] text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {server.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex w-full flex-row items-center gap-3">
                  <span className="flex min-w-[65px] flex-row items-center gap-1.5 text-xs font-bold tracking-wider text-zinc-400">
                    <Mic className="h-4 w-4" />
                    DUB:
                  </span>
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    {dubServers.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => {
                          setSelectedServer(server.id);
                          setSelectedLang('dub');
                        }}
                        className={`cursor-pointer rounded-md border px-5 py-1.5 text-xs font-semibold tracking-wide transition-all duration-200 ${
                          activeServerId === server.id && activeLang === 'dub'
                            ? 'border-[#60a5fa]/50 bg-[#60a5fa] text-black shadow-md'
                            : 'border-white/5 bg-white/[0.06] text-zinc-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {server.name}
                      </button>
                    ))}
                  </div>
                </div>

                {availableServers.length === 0 ? (
                  <div className="rounded-md border border-white/5 bg-white/[0.03] px-3 py-2 text-xs text-white/40">
                    {isStreamLoading ? 'Loading streaming provider...' : 'No streaming provider available for this episode yet.'}
                  </div>
                ) : null}
              </div>
            </div>

            {nextEpDate ? (
              <div className="flex w-full flex-col items-center justify-between gap-3 rounded-xl px-5 py-4 sm:flex-row sm:gap-4" style={{ background: 'color-mix(in oklch, var(--primary) 10%, black)' }}>
                <div className="flex flex-col items-center text-center sm:flex-row sm:gap-2.5 sm:text-left">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="hidden h-5 w-5 shrink-0 text-primary sm:block">
                    <path d="M16 14v2.2l1.6 1" />
                    <path d="M16 2v4" />
                    <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5" />
                    <path d="M3 10h5" />
                    <path d="M8 2v4" />
                    <circle cx="16" cy="16" r="6" />
                  </svg>
                  <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-1.5">
                    <span className="text-xs font-medium text-zinc-400 sm:text-sm">The next episode is expected to be released on</span>
                    <span className="text-sm font-bold tracking-wide text-white">
                      {nextEpDate.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })},{' '}
                      {nextEpDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                    </span>
                  </div>
                </div>
                <span className="text-center text-[13px] font-medium text-primary sm:text-right sm:text-sm">
                  {countdown.days} days, {countdown.hours} hours, {countdown.minutes} minutes, {countdown.seconds} seconds
                </span>
              </div>
            ) : null}

            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 lg:hidden">
              <div className="flex gap-4">
                <div className="aspect-[3/4] w-20 shrink-0 overflow-hidden rounded-lg border border-white/10">
                  <img src={anime.coverImage} alt={anime.title} className="h-full w-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="line-clamp-2 text-sm font-bold text-white">{anime.title}</h3>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <span className={`flex items-center gap-1 text-[10px] font-bold ${statusColor}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                      {animeStatus}
                    </span>
                    {anime.episodes ? <span className="text-[10px] text-white/40">{anime.episodes} eps</span> : null}
                    <span className="flex items-center gap-0.5 text-[10px] text-[#facc15]">
                      <Star className="h-3 w-3 fill-[#facc15] text-[#facc15]" />
                      {formatScore(anime.score)}
                    </span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[11px] text-white/35">{synopsis}</p>
                  {onAnimeDetails ? (
                    <button
                      onClick={() => onAnimeDetails(anime)}
                      className="mt-2 flex items-center gap-1 text-[11px] font-medium text-primary/70 transition-colors hover:text-primary"
                    >
                      View Details →
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="lg:hidden">
              <div className="rounded-lg border border-white/[0.06] bg-white/[0.02]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-[3px] rounded-full bg-primary shadow-[0_0_6px_rgba(139,92,246,0.5)]" />
                    <h3 className="text-sm font-bold text-white/80">Episodes</h3>
                    <span className="text-xs text-white/30">{totalEpisodes}</span>
                  </div>
                </div>
                <div className="custom-scrollbar max-h-72 overflow-y-auto">
                  {episodes.length > 0 ? episodes.map((ep) => (
                    <button
                      key={ep.number}
                      onClick={() => handleEpisodeClick(ep.number)}
                      className={`flex w-full items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 transition-colors last:border-b-0 ${
                        currentEpisode === ep.number ? 'border-l-2 border-l-primary bg-primary/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <span className={`w-6 shrink-0 text-right text-sm font-bold ${currentEpisode === ep.number ? 'text-primary' : 'text-white/30'}`}>
                        {ep.number}
                      </span>
                      <span className={`flex-1 text-left text-sm ${currentEpisode === ep.number ? 'font-medium text-white' : 'text-white/50'}`}>
                        {ep.title}
                      </span>
                      {currentEpisode === ep.number ? <Play className="h-3.5 w-3.5 shrink-0 fill-primary text-primary" /> : null}
                    </button>
                  )) : (
                    <div className="px-4 py-6 text-center text-sm text-white/40">
                      {isStreamLoading ? 'Loading provider episodes...' : 'No provider episodes available yet.'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden w-[clamp(300px,28vw,420px)] shrink-0 self-stretch lg:block">
            <div className="mr-2 flex h-full flex-col lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)]">
              <div className="mb-3 flex flex-col gap-3">
                <div className="flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-medium xl:text-xl">Episodes</h1>
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-xs font-semibold text-white/70">{totalEpisodes}</span>
                  </div>
                  <div className="flex flex-row items-center justify-center gap-2">
                    <button
                      onClick={() => setEpisodeViewMode(episodeViewMode === 'list' ? 'grid' : 'list')}
                      className="text-zinc-400 transition-colors hover:text-white"
                      aria-label="Toggle episode view"
                    >
                      <LayoutGrid className="h-5 w-5" />
                    </button>
                    <button className="text-zinc-400 transition-colors hover:text-white" aria-label="Toggle spoiler shield" title="Enable spoiler shield">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                        <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="relative w-full">
                  <input
                    type="text"
                    placeholder="Search episodes..."
                    value={episodeSearch}
                    onChange={(e) => setEpisodeSearch(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700/50 bg-zinc-800/60 px-3 py-2 pr-10 text-xs font-medium text-white placeholder-zinc-400 outline-none transition-all duration-200 focus:border-primary/50 focus:bg-zinc-800/80 focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 transform">
                    <Search className="h-4 w-4 text-zinc-400" />
                  </div>
                </div>
              </div>

              <div className="custom-scrollbar h-full max-h-[26rem] w-full flex-1 overflow-y-auto lg:max-h-full">
                {filteredEpisodes.length === 0 ? (
                  <div className="flex h-full min-h-40 items-center justify-center px-6 py-10 text-center text-sm text-white/40">
                    {isStreamLoading ? 'Loading provider episodes...' : 'No provider episodes available yet.'}
                  </div>
                ) : episodeViewMode === 'list' ? (
                  filteredEpisodes.map((ep) => (
                    <button
                      key={ep.number}
                      onClick={() => handleEpisodeClick(ep.number)}
                      className={`group relative mb-1.5 flex h-20 w-full shrink-0 flex-row items-center overflow-hidden rounded-md border transition-all duration-200 ease-out ${
                        currentEpisode === ep.number
                          ? 'pointer-events-none border-white bg-white/5'
                          : 'border-white/5 bg-transparent hover:bg-white/5'
                      }`}
                    >
                      <div className="relative h-full w-[142px] min-w-[142px] shrink-0 overflow-hidden border-r border-white/5 bg-zinc-900">
                        <img
                          alt={`Episode ${ep.number}`}
                          className={`h-full w-full object-cover transition-all duration-300 ${currentEpisode === ep.number ? 'opacity-40' : 'opacity-100'}`}
                          src={ep.thumbnail || anime.coverImage}
                          loading="lazy"
                        />
                        {currentEpisode === ep.number ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 translate-x-[1px] text-white" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-1 flex-col justify-center gap-0.5 overflow-hidden px-3 py-1">
                        <div className={`line-clamp-1 text-sm font-bold tracking-wide transition-colors ${
                          currentEpisode === ep.number ? 'text-white' : 'text-white group-hover:text-primary'
                        }`}>
                          {ep.title}
                        </div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="grid grid-cols-3 gap-1 p-2">
                    {filteredEpisodes.map((ep) => (
                      <button
                        key={ep.number}
                        onClick={() => handleEpisodeClick(ep.number)}
                        className={`group/ep relative aspect-video overflow-hidden rounded transition-all ${
                          currentEpisode === ep.number ? 'ring-2 ring-primary' : 'hover:ring-1 hover:ring-white/20'
                        }`}
                      >
                        <img src={ep.thumbnail || anime.coverImage} alt="" className="h-full w-full object-cover" loading="lazy" />
                        <div className="absolute inset-0 bg-black/40 transition-colors group-hover/ep:bg-black/20" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {currentEpisode === ep.number ? (
                            <Play className="h-4 w-4 fill-primary text-primary" />
                          ) : (
                            <span className="text-xs font-bold text-white/80">{ep.number}</span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
