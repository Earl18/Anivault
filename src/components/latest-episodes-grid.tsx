'use client';

import { Star, ChevronLeft, ChevronRight, Play, Clock } from 'lucide-react';
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AnimeGridItem } from '@/lib/anime-data';
import { MarqueeTitle } from '@/components/ui/marquee-title';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

type FilterType = 'all' | 'sub' | 'dub';

const ITEMS_PER_PAGE = 12;

interface LatestEpisodesGridProps {
  episodes: AnimeGridItem[];
  titlePreference: TitlePreference;
  onAnimeClick?: (anime: AnimeGridItem) => void;
}

function PortraitEpisodeCard({
  anime,
  index,
  titlePreference,
  onClick,
}: {
  anime: AnimeGridItem;
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
      {/* Portrait Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={anime.thumbnail}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />

        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* Hover overlay with play button */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
              <Play className="w-6 h-6 text-black fill-black ml-0.5" />
            </div>
          </div>
        </div>

        {/* Score badge - top right */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-primary text-xs font-bold">
          <Star className="w-3 h-3 fill-primary text-primary" />
          {anime.score.toFixed(1)}
        </div>

        {/* Rating badge - top left */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white/70 text-[10px] font-semibold">
          {anime.rating}
        </div>

        {/* Episode info - bottom left */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <div className="px-2 py-0.5 rounded-md bg-primary text-black text-xs font-bold shadow-lg shadow-primary/30">
            EP {anime.currentEpisode}
          </div>
        </div>

        {/* Sub/Dub badge - bottom right */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1">
          {anime.subDub === 'both' ? (
            <>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">SUB</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/30">DUB</span>
            </>
          ) : anime.subDub === 'dub' ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/30">DUB</span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">SUB</span>
          )}
        </div>
      </div>

      {/* Info section */}
      <div className="p-2 flex-1 flex flex-col gap-1">
        <div className="flex items-start gap-1.5">
          {/* Active status indicator - circle */}
          <div className="mt-1 shrink-0 w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_rgba(139,92,246,0.55)]" />
          <MarqueeTitle
            text={displayTitle}
            className="text-xs font-semibold text-white group-hover:text-primary transition-colors leading-tight"
          />
        </div>
        <div className="flex items-center gap-1.5 pl-4 text-[10px] text-white/40">
          <span>{anime.format}</span>
          <span className="text-white/20">·</span>
          <div className="flex items-center gap-0.5">
            <Clock className="w-2.5 h-2.5" />
            <span>{anime.duration}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function LatestEpisodesGrid({ episodes, titlePreference, onAnimeClick }: LatestEpisodesGridProps) {
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(0);

  const filteredEpisodes = filter === 'all'
    ? episodes
    : episodes.filter(e =>
        filter === 'sub' ? e.subDub === 'sub' || e.subDub === 'both' : e.subDub === 'dub' || e.subDub === 'both'
      );

  const totalPages = Math.ceil(filteredEpisodes.length / ITEMS_PER_PAGE);
  const displayEpisodes = filteredEpisodes.slice(
    page * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE + ITEMS_PER_PAGE
  );

  const handlePrev = useCallback(() => {
    setPage((p) => Math.max(0, p - 1));
  }, []);

  const handleNext = useCallback(() => {
    setPage((p) => Math.min(totalPages - 1, p + 1));
  }, [totalPages]);

  const handleFilterChange = useCallback((f: FilterType) => {
    setFilter(f);
    setPage(0);
  }, []);

  return (
    <section>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-[3px] h-5 rounded-full bg-primary shadow-[0_0_8px_rgba(139,92,246,0.6)]" />
          <h2 className="text-xl font-bold tracking-tight text-white/90">Latest Episodes</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Filter tabs */}
          <div className="flex items-center gap-3">
            {(['all', 'sub', 'dub'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => handleFilterChange(f)}
                className={`text-sm font-medium transition-colors ${
                  filter === f
                    ? 'text-primary'
                    : 'text-white/40 hover:text-white/60'
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Navigation arrows + page indicator */}
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
        </div>
      </div>

      {/* 6-column Portrait Grid */}
      <AnimatePresence mode="wait">
        <motion.div
          key={page + filter}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3"
        >
          {displayEpisodes.map((anime, i) => (
            <PortraitEpisodeCard
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
