'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Play, Info, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Anime } from '@/lib/anime-data';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

export function HeroCarousel({
  animeList,
  titlePreference,
  onAnimeClick,
  onWatchNow,
}: {
  animeList: Anime[];
  titlePreference: TitlePreference;
  onAnimeClick?: (anime: Anime) => void;
  onWatchNow?: (anime: Anime) => void;
}) {
  const uniqueAnimeList = useMemo(() => {
    const seen = new Set<string>();

    return animeList.filter((item) => {
      if (seen.has(item.id)) {
        return false;
      }

      seen.add(item.id);
      return true;
    });
  }, [animeList]);

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(0);

  const goTo = useCallback((index: number) => {
    setDirection(index > current ? 1 : -1);
    setCurrent(index);
  }, [current]);

  const next = useCallback(() => {
    if (uniqueAnimeList.length === 0) {
      return;
    }

    setDirection(1);
    setCurrent((prev) => (prev + 1) % uniqueAnimeList.length);
  }, [uniqueAnimeList.length]);

  const prev = useCallback(() => {
    if (uniqueAnimeList.length === 0) {
      return;
    }

    setDirection(-1);
    setCurrent((prev) => (prev - 1 + uniqueAnimeList.length) % uniqueAnimeList.length);
  }, [uniqueAnimeList.length]);

  useEffect(() => {
    if (uniqueAnimeList.length === 0) {
      return;
    }

    const timer = setInterval(next, 8000);
    return () => clearInterval(timer);
  }, [uniqueAnimeList.length, next]);

  if (uniqueAnimeList.length === 0) {
    return null;
  }

  const safeCurrent = current >= uniqueAnimeList.length ? 0 : current;
  const anime = uniqueAnimeList[safeCurrent];
  const displayTitle = getPreferredTitle(anime, titlePreference);
  const desktopHeroImage = anime.carouselImage || anime.coverImage;
  const mobileHeroImage = anime.coverImage || anime.carouselImage;
  const usesPosterLayout =
    !anime.carouselImage ||
    anime.carouselImage === anime.coverImage ||
    anime.carouselImage.trim().length === 0;

  return (
    <section className="mb-8">
      <div className="relative h-[70vh] w-full overflow-hidden select-none sm:h-[60vh] lg:h-[70vh]" style={{ cursor: 'grab' }}>
        {/* Desktop banner image */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`desktop-${current}`}
            custom={direction}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 hidden sm:block"
          >
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-[6000ms] ease-out"
              style={{ backgroundImage: `url(${desktopHeroImage})` }}
            />
            {usesPosterLayout ? (
              <>
                <div
                  className="absolute inset-[-6%] bg-cover bg-center opacity-45 blur-xl scale-110 saturate-[0.95]"
                  style={{ backgroundImage: `url(${desktopHeroImage})` }}
                />
                <div className="absolute inset-0 flex items-end justify-end pr-[8%]">
                  <img
                    src={desktopHeroImage}
                    alt=""
                    className="h-[112%] w-auto max-w-none object-contain object-right-bottom opacity-95"
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.24)_55%,rgba(0,0,0,0.64)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.86)_0%,rgba(0,0,0,0.58)_30%,rgba(0,0,0,0.18)_56%,rgba(0,0,0,0.3)_100%)]" />
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Mobile cover image */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`mobile-${current}`}
            custom={direction}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7, ease: 'easeInOut' }}
            className="absolute inset-0 sm:hidden"
          >
            <div
              className="absolute inset-0 bg-cover bg-top transition-transform duration-[6000ms] ease-out"
              style={{ backgroundImage: `url(${mobileHeroImage})` }}
            />
            <div
              className="absolute inset-0 bg-cover bg-[center_18%] opacity-100 saturate-[1.02] brightness-[0.9]"
              style={{ backgroundImage: `url(${mobileHeroImage})` }}
            />
            {usesPosterLayout ? (
              <>
                <div
                  className="absolute inset-[-8%] bg-cover bg-center opacity-35 blur-lg scale-110"
                  style={{ backgroundImage: `url(${mobileHeroImage})` }}
                />
                <div className="absolute inset-x-0 bottom-0 top-8 flex items-end justify-center">
                  <img
                    src={mobileHeroImage}
                    alt=""
                    className="h-full w-auto max-w-none object-contain object-center opacity-95"
                  />
                </div>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.18)_0%,rgba(0,0,0,0.22)_44%,rgba(0,0,0,0.68)_100%)]" />
              </>
            ) : null}
          </motion.div>
        </AnimatePresence>

        {/* Gradient overlays - desktop */}
        <div className="absolute inset-0 hidden sm:block">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-transparent" />
          {usesPosterLayout ? (
            <div className="absolute inset-y-0 left-0 w-[44%] bg-gradient-to-r from-black/78 via-black/42 to-transparent" />
          ) : null}
        </div>

        {/* Gradient overlays - mobile */}
        <div className="absolute inset-0 sm:hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-black/30" />
        </div>

        {/* Content */}
        <div className="absolute right-0 bottom-0 left-0 p-6 sm:p-10 lg:p-16">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              className="max-w-2xl text-center sm:text-left"
            >
              {/* Tags */}
              <div className="mb-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <span className="flex items-center gap-1 rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary">
                  ★ {anime.score.toFixed(1)}
                </span>
                <span className="rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary">
                  {anime.format}
                </span>
                <span className="rounded bg-black/80 px-2 py-1 text-sm font-semibold text-primary">
                  {anime.year}
                </span>
              </div>

              {/* Title */}
              <h1 className="mb-4 line-clamp-1 text-2xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
                {displayTitle}
              </h1>

              {/* Description */}
              <p className="mx-auto mb-4 line-clamp-3 max-w-xl text-sm text-gray-300 sm:mx-0 sm:text-base">
                {anime.description}
              </p>

              {/* Buttons */}
              <div className="mt-4 flex items-center justify-center gap-3 sm:justify-start sm:gap-4 lg:gap-6">
                {/* Watch Now button */}
                <button
                  onClick={() => onWatchNow?.(anime)}
                  className="group relative flex -skew-x-12 items-center justify-center overflow-hidden bg-primary px-5 py-2 transition-all duration-300 hover:scale-105 hover:bg-primary/90 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)] hover:shadow-primary/50 sm:px-8 sm:py-3">
                  <div className="absolute -top-1.5 -left-1.5 flex size-5 items-center justify-center bg-black/20" />
                  <div className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center bg-white/20" />
                  <div className="pointer-events-none absolute inset-0 flex h-full w-full justify-center [transform:translateX(-150%)] group-hover:[transform:translateX(150%)] group-hover:duration-1000">
                    <div className="relative h-full w-12 bg-white/40 blur-[2px]" />
                  </div>
                  <div className="relative z-10 flex skew-x-12 items-center gap-2 text-xs font-black tracking-[0.2em] text-black uppercase sm:text-sm">
                    <Play className="size-4 fill-current sm:size-5" />
                    <span>Watch Now</span>
                  </div>
                </button>

                {/* Details button */}
                <button
                  onClick={() => onAnimeClick?.(anime)}
                  className="group relative flex -skew-x-12 items-center justify-center overflow-hidden border border-white/20 bg-black/60 px-5 py-2 transition-all duration-300 hover:scale-105 hover:border-primary/80 hover:bg-black/80 sm:px-8 sm:py-3">
                  <div className="absolute top-0 right-0 h-full w-1 bg-white/10 transition-colors group-hover:bg-primary/50" />
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  <div className="relative z-10 flex skew-x-12 items-center gap-2 text-xs font-bold tracking-[0.2em] text-white uppercase sm:text-sm">
                    <Info className="size-4 transition-transform group-hover:rotate-12 sm:size-5" />
                    <span>Details</span>
                  </div>
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation arrows - top right */}
        <div className="absolute top-20 right-4 z-40 flex gap-2">
          <button
            onClick={prev}
            className="rounded border border-white/10 bg-black/60 p-2 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/80"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={next}
            className="rounded border border-white/10 bg-black/60 p-2 text-white backdrop-blur-sm transition-all duration-300 hover:bg-black/80"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* Dot indicators - bottom right */}
        <div className="absolute right-6 bottom-6 hidden items-center gap-2 sm:right-10 sm:bottom-10 sm:flex">
          {uniqueAnimeList.map((item, index) => (
            <button
              key={item.id}
              onClick={() => goTo(index)}
              aria-label={`Go to ${getPreferredTitle(uniqueAnimeList[index], titlePreference)}`}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                index === safeCurrent
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
