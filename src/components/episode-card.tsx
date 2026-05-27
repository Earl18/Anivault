'use client';

import { Play, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Episode } from '@/lib/anime-data';
import { MarqueeTitle } from '@/components/ui/marquee-title';

interface EpisodeCardProps {
  episode: Episode;
  index?: number;
}

export function EpisodeCard({ episode, index }: EpisodeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: (index || 0) * 0.05 }}
      className="group relative flex flex-col rounded-xl overflow-hidden border border-white/[0.05] bg-[#050505] cursor-pointer transition-all duration-300 hover:border-primary/20 hover:scale-[1.02] shrink-0 w-[260px] sm:w-[300px]"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden">
        <img
          src={episode.thumbnail}
          alt={episode.animeTitle}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
        />
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/20">
              <Play className="w-6 h-6 text-black fill-black" />
            </div>
          </div>
        </div>

        {/* Episode number badge */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-primary text-black text-xs font-bold shadow-lg shadow-primary/30">
          EP {episode.episodeNumber}
        </div>

        {/* Time badge */}
        {episode.airingAt && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-sm text-white/60 text-[10px]">
            <Clock className="w-3 h-3" />
            {episode.airingAt}
          </div>
        )}

        {/* Progress bar (simulated) */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
          <div className="h-full bg-primary/60" style={{ width: `${Math.random() * 60 + 20}%` }} />
        </div>
      </div>

      {/* Info */}
      <div className="p-3 flex items-center gap-2.5">
        {/* Small anime cover */}
        <div className="w-9 h-9 rounded-md overflow-hidden shrink-0 border border-white/[0.05]">
          <img
            src={episode.animeCover}
            alt={episode.animeTitle}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
        <div className="min-w-0 flex-1">
          <MarqueeTitle
            text={episode.animeTitle}
            className="text-sm font-medium text-white group-hover:text-primary transition-colors"
          />
          {episode.title && (
            <p className="text-xs text-white/40 line-clamp-1 mt-0.5">
              EP {episode.episodeNumber} · {episode.title}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
