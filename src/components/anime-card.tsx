'use client';

import { Star, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Anime } from '@/lib/anime-data';
import { MarqueeTitle } from '@/components/ui/marquee-title';

interface VerticalCardProps {
  anime: Anime;
  rank?: number;
  index?: number;
}

export function VerticalCard({ anime, rank, index }: VerticalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index || 0) * 0.05 }}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-white/[0.05] bg-[#050505] cursor-pointer transition-all duration-300 hover:border-primary/30 hover:scale-[1.03]"
      style={{ boxShadow: undefined }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0 30px rgba(139, 92, 246, 0.25)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `none`;
      }}
    >
      {/* Cover image */}
      <div className="relative aspect-[3/4] overflow-hidden">
        <img
          src={anime.coverImage}
          alt={anime.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-10 h-10 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/20">
              <Play className="w-5 h-5 text-black fill-black" />
            </div>
          </div>
        </div>

        {/* Score badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-primary text-xs font-bold">
          <Star className="w-3 h-3 fill-primary" />
          {anime.score.toFixed(1)}
        </div>

        {/* Rank badge */}
        {rank !== undefined && (
          <div className="absolute bottom-2 left-2 flex items-center justify-center w-7 h-7 rounded-lg bg-primary text-black text-xs font-black shadow-lg shadow-primary/30">
            #{rank}
          </div>
        )}

        {/* Format badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white/60 text-[10px] font-medium">
          {anime.format}
        </div>
      </div>

      {/* Info */}
      <div className="p-2.5">
        <MarqueeTitle
          text={anime.title}
          className="text-sm font-semibold text-white group-hover:text-primary transition-colors leading-tight"
        />
        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/40">
          <span>{anime.format}</span>
          {anime.episodes && (
            <>
              <span className="text-white/20">·</span>
              <span>{anime.episodes} eps</span>
            </>
          )}
          <span className="text-white/20">·</span>
          <span>{anime.year}</span>
        </div>
        {/* Genre tags */}
        {anime.genre.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {anime.genre.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="px-1.5 py-0.5 rounded text-[10px] bg-white/[0.05] text-white/30"
              >
                {genre}
              </span>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface HorizontalCardProps {
  anime: Anime;
  index?: number;
}

export function HorizontalCard({ anime, index }: HorizontalCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: (index || 0) * 0.05 }}
      className="group flex gap-3 p-2 rounded-xl border border-white/[0.05] bg-[#050505] cursor-pointer transition-all duration-300 hover:border-primary/20 hover:bg-white/[0.02]"
    >
      {/* Cover */}
      <div className="relative w-12 h-16 rounded-lg overflow-hidden shrink-0">
        <img
          src={anime.coverImage}
          alt={anime.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
      {/* Info */}
      <div className="flex flex-col justify-center min-w-0">
        <MarqueeTitle
          text={anime.title}
          className="text-sm font-medium text-white group-hover:text-primary transition-colors"
        />
        <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
          <span>{anime.format}</span>
          <span>· {anime.year}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-xs text-primary">
          <Star className="w-3 h-3 fill-primary" />
          {anime.score.toFixed(1)}
        </div>
      </div>
    </motion.div>
  );
}
