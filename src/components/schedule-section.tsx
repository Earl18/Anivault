'use client';

import { useState } from 'react';
import { Eye, MessageCircle, Star } from 'lucide-react';
import type { TrendingItem } from '@/lib/anime-data';
import { MarqueeTitle } from '@/components/ui/marquee-title';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

type TrendingFilter = 'day' | 'week' | 'month';

function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
}

function rankGlowClass(rank: number): string {
  const glowClasses = [
    'text-cyan-400/14',
    'text-lime-300/14',
    'text-sky-400/14',
    'text-amber-400/14',
    'text-orange-300/14',
    'text-blue-400/14',
    'text-fuchsia-400/14',
  ];

  return glowClasses[(rank - 1) % glowClasses.length];
}

function TrendingListItem({
  item,
  titlePreference,
  onClick,
}: {
  item: TrendingItem;
  titlePreference: TitlePreference;
  onClick?: () => void;
}) {
  const displayTitle = getPreferredTitle(item, titlePreference);

  return (
    <button
      onClick={onClick}
      className="group relative flex w-full overflow-hidden rounded-2xl border border-white/[0.05] bg-[#111119] text-left transition-all duration-300 hover:border-primary/20 hover:bg-[#15151d]"
      type="button"
    >
      <div
        className="absolute inset-0 bg-cover bg-center opacity-20 transition-transform duration-500 group-hover:scale-105"
        style={{ backgroundImage: `url(${item.coverImage})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/92 to-[#0a0a0f]/70" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.14),transparent_40%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative flex min-h-[72px] w-full items-center gap-2.5 px-3 py-2.5">
        <div className="relative flex w-14 shrink-0 items-center justify-center self-stretch">
          <span
            className={`pointer-events-none absolute inset-0 flex items-center justify-center text-[4.6rem] font-black italic leading-none tracking-[-0.1em] ${rankGlowClass(item.rank)}`}
            style={{ WebkitTextStroke: '2px rgba(255,255,255,0.08)' }}
          >
            {item.rank}
          </span>
          <span className="relative z-10 text-[1.7rem] font-black italic leading-none text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]">
            {item.rank}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <MarqueeTitle
            text={displayTitle}
            className="text-[0.9rem] font-bold tracking-tight text-white transition-colors group-hover:text-primary"
          />

          <div className="mt-1.5 flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-[10px] text-white/55">
            <div className="flex items-center gap-1 font-bold text-[#facc15]">
              <Star className="size-3 fill-[#facc15] text-[#facc15]" />
              <span>{item.score.toFixed(1)}</span>
            </div>
            <span className="font-semibold uppercase tracking-wide text-white/65">{item.format}</span>
            <div className="flex items-center gap-0.5 rounded bg-white/[0.06] px-1.5 py-0.5">
              <Eye className="size-3" />
              <span>{formatNumber(item.views)}</span>
            </div>
            <div className="flex items-center gap-0.5 rounded bg-white/[0.06] px-1.5 py-0.5">
              <MessageCircle className="size-3" />
              <span>{formatNumber(item.comments)}</span>
            </div>
            <span className="rounded bg-white/[0.06] px-1.5 py-0.5 font-medium text-white/65">
              #{item.rank}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export function ScheduleSection({
  items,
  titlePreference,
  onAnimeClick,
}: {
  items: TrendingItem[];
  titlePreference: TitlePreference;
  onAnimeClick?: (item: TrendingItem) => void;
}) {
  const [trendingFilter, setTrendingFilter] = useState<TrendingFilter>('day');

  return (
    <section className="rounded-2xl border border-white/[0.06] bg-[#111119] p-4 shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-[1.9rem] font-black tracking-[-0.04em] text-white">Top Trending</h2>

        <div className="flex items-center rounded-xl border border-white/[0.07] bg-[#15151d] p-1">
          {(['day', 'week', 'month'] as TrendingFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTrendingFilter(filter)}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-wide transition-all ${
                trendingFilter === filter
                  ? 'border border-white/[0.08] bg-white/[0.06] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
                  : 'text-white/35 hover:text-white/65'
              }`}
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <TrendingListItem
            key={item.id}
            item={item}
            titlePreference={titlePreference}
            onClick={() => onAnimeClick?.(item)}
          />
        ))}
      </div>
    </section>
  );
}
