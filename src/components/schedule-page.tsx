'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ScheduleDayItem } from '@/lib/anime-data';
import { fetchWeeklySchedule } from '@/lib/anime-client';
import type { ScheduleEntry } from '@/lib/anime-client';
import { MarqueeTitle } from '@/components/ui/marquee-title';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

/* ── Day Tab Button ── */
function DayTab({
  day,
  date,
  isActive,
  isToday,
  onClick,
}: {
  day: string;
  date: number;
  isActive: boolean;
  isToday: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex h-[70px] min-w-[70px] flex-shrink-0 flex-col items-center justify-center rounded-2xl border transition-all duration-300 ${
        isActive
          ? 'scale-105 border-white bg-white text-black shadow-lg shadow-white/10'
          : 'border-transparent bg-[#18181b]/50 text-gray-400 hover:bg-[#18181b] hover:text-white'
      }`}
    >
      {isToday && !isActive && (
        <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/40 opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
        </span>
      )}
      <span className="mb-0.5 text-[10px] font-bold tracking-widest uppercase opacity-70">
        {day}
      </span>
      <span className="text-xl font-bold">{date}</span>
    </button>
  );
}

/* ── Card content shared between mobile & desktop ── */
function CardContent({
  item,
  size,
  titlePreference,
}: {
  item: ScheduleDayItem;
  size: 'mobile' | 'desktop';
  titlePreference: TitlePreference;
}) {
  const displayTitle = getPreferredTitle(item, titlePreference);

  return (
    <div className={`flex ${size === 'desktop' ? 'gap-4' : 'gap-3'} rounded-xl border border-white/[0.06] bg-[#09090d] ${size === 'desktop' ? 'p-3' : 'p-2.5'} transition-all duration-300 hover:border-white/[0.12] hover:bg-[#111119]`}>
      <div className={`${size === 'desktop' ? 'w-24 h-32' : 'w-16 h-[88px]'} rounded-lg overflow-hidden shrink-0`}>
        <img
          loading="lazy"
          src={item.coverImage}
          alt={item.title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <MarqueeTitle
          text={displayTitle}
          className={`${size === 'desktop' ? 'text-sm' : 'text-xs'} font-semibold text-white group-hover:text-primary transition-colors leading-tight`}
        />
        {size === 'desktop' && item.description && (
          <p className="text-xs text-white/30 line-clamp-2 mt-1.5 leading-relaxed">
            {item.description}
          </p>
        )}
        <div className={`flex flex-wrap ${size === 'desktop' ? 'gap-1.5 mt-2' : 'gap-1 mt-1.5'}`}>
          {item.genre.slice(0, size === 'desktop' ? 3 : 2).map((genre) => (
            <span
              key={genre}
              className={`${size === 'desktop' ? 'px-2' : 'px-1.5'} py-0.5 rounded text-[10px] font-medium bg-white/[0.06] text-white/50 ${size === 'desktop' ? 'transition-colors hover:bg-[#3f3f46] hover:text-white cursor-pointer' : ''}`}
            >
              {genre}
            </span>
          ))}
        </div>
        <div className="mt-auto">
          {item.isAired ? (
            <span className={`${size === 'desktop' ? 'text-[11px]' : 'text-[10px]'} font-medium text-primary/70`}>Aired</span>
          ) : (
            <span className={`${size === 'desktop' ? 'text-[11px]' : 'text-[10px]'} font-medium text-white/30`}>Upcoming</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Timeline Card ── */
function TimelineCard({
  item,
  index,
  isLeft,
  titlePreference,
  onClick,
}: {
  item: ScheduleDayItem;
  index: number;
  isLeft: boolean;
  titlePreference: TitlePreference;
  onClick?: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      className="relative z-10 w-full"
    >
      {/* Timeline dot - left on mobile, center on desktop */}
      <div className="absolute top-[34px] left-[20px] z-20 flex flex-col items-center md:top-1/2 md:left-[50%] md:-translate-x-1/2 md:-translate-y-1/2">
        <div className="relative z-10 py-1">
          <div
            className={`relative flex h-[18px] w-[18px] items-center justify-center rounded-full border-2 transition-all duration-500 ${
              item.isAired
                ? 'border-primary/60 bg-black'
                : 'border-white/[0.12] bg-black'
            }`}
          >
            <div
              className={`h-1.5 w-1.5 rounded-full ${
                item.isAired ? 'bg-primary shadow-[0_0_6px_rgba(139,92,246,0.55)]' : 'bg-white/[0.12]'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Card always on the right side of the dot */}
      <div className="pl-14 md:hidden">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-semibold text-white/60">{item.time}</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/[0.06] text-white/40">
            EP {item.episode}
          </span>
        </div>
        <div onClick={onClick} className="group block cursor-pointer">
          <CardContent item={item} size="mobile" titlePreference={titlePreference} />
        </div>
      </div>

      {/* Desktop: Alternating left/right layout */}
      <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:items-center md:gap-0">
        {/* Left side */}
        <div className={`${isLeft ? 'pr-8' : ''}`}>
          {isLeft ? (
            <div onClick={onClick} className="group block cursor-pointer">
              <CardContent item={item} size="desktop" titlePreference={titlePreference} />
            </div>
          ) : (
            <div className="text-end">
              <span className="text-sm font-semibold text-white/80">{item.time}</span>
              <br />
              <span className="text-xs text-white/30">Episode {item.episode}</span>
            </div>
          )}
        </div>

        {/* Center - dot spacer */}
        <div className="w-[18px]" />

        {/* Right side */}
        <div className={`${!isLeft ? 'pl-8' : ''}`}>
          {!isLeft ? (
            <div onClick={onClick} className="group block cursor-pointer">
              <CardContent item={item} size="desktop" titlePreference={titlePreference} />
            </div>
          ) : (
            <div className="text-start">
              <span className="text-sm font-semibold text-white/80">{item.time}</span>
              <br />
              <span className="text-xs text-white/30">Episode {item.episode}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Schedule Page ── */
export function SchedulePage({
  onAnimeClick,
  titlePreference,
}: {
  onAnimeClick?: (item: ScheduleDayItem) => void;
  titlePreference: TitlePreference;
}) {
  // Get current date info
  const [todayInfo] = useState(() => {
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(now);
    monday.setDate(now.getDate() - dayIndex);
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.getDate();
    });
    return { currentDayIndex: dayIndex, weekDates: dates };
  });

  const [selectedDayIndex, setSelectedDayIndex] = useState(todayInfo.currentDayIndex);
  const [scheduleEntries, setScheduleEntries] = useState<ScheduleEntry[]>([]);

  const dayNames = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
  const weekDates = todayInfo.weekDates;
  useEffect(() => {
    let isCancelled = false;

    void fetchWeeklySchedule()
      .then((entries) => {
        if (!isCancelled) {
          setScheduleEntries(entries);
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setScheduleEntries([]);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  const groupedSchedule = useMemo(() => {
    const grouped = Array.from({ length: 7 }, () => [] as (ScheduleDayItem & { airingAt: number })[]);

    scheduleEntries.forEach((entry) => {
      const date = new Date(entry.airingAt * 1000);
      const mondayBasedIndex = (date.getDay() + 6) % 7;

      grouped[mondayBasedIndex].push({
        id: entry.id,
        title: entry.title,
        englishTitle: entry.englishTitle,
        romajiTitle: entry.romajiTitle,
        nativeTitle: entry.nativeTitle,
        coverImage: entry.coverImage,
        time: entry.time,
        episode: entry.episode,
        description: entry.description,
        genre: entry.genre,
        isAired: entry.isAired,
        airingAt: entry.airingAt,
      });
    });

    grouped.forEach((day) => {
      day.sort((left, right) => left.airingAt - right.airingAt);
    });

    return grouped.map((day) =>
      day.map(({ airingAt: _airingAt, ...item }) => item)
    );
  }, [scheduleEntries]);

  const selectedDayData = groupedSchedule[selectedDayIndex] || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black text-white"
    >
      {/* Hero Section */}
      <div className="relative -mt-16 h-56 w-full overflow-visible pt-16 sm:h-64">
        {/* Blurred background */}
        <div className="pointer-events-none absolute inset-0 -bottom-32 z-0 overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: 'url("/anivault-logo.png")',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: 'blur(40px)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
        </div>

        {/* Title */}
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-center px-4 pb-8">
          <div className="text-center">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="mb-2 text-4xl font-extrabold tracking-tight text-white drop-shadow-md md:text-5xl"
            >
              Weekly Schedule
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="text-sm font-medium text-gray-400"
            >
              Keep track of your favorite anime airing times
            </motion.p>
          </div>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="px-4 py-8 md:py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="-mx-4 -mt-4 mb-16 flex items-center justify-start gap-2 overflow-x-auto pt-4 pr-4 pb-4 pl-3 no-scrollbar md:justify-center md:px-4"
          role="tablist"
        >
          {dayNames.map((day, i) => (
            <DayTab
              key={day}
              day={day}
              date={weekDates[i]}
              isActive={selectedDayIndex === i}
              isToday={i === todayInfo.currentDayIndex}
              onClick={() => setSelectedDayIndex(i)}
            />
          ))}
        </motion.div>

        {/* Timeline */}
        <div className="relative mx-auto w-full max-w-7xl md:px-10">
          <div className="relative flex flex-col gap-12 pb-20">
            {/* Timeline vertical line */}
            <div className="absolute top-4 bottom-0 left-[28px] z-0 w-px bg-white/[0.08] md:left-[50%] md:-translate-x-1/2" />

            <AnimatePresence mode="wait">
              <motion.div
                key={selectedDayIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-12"
              >
                {selectedDayData.length > 0 ? (
                  selectedDayData.map((item, i) => (
                    <TimelineCard
                      key={item.id}
                      item={item}
                      index={i}
                      isLeft={i % 2 === 0}
                      titlePreference={titlePreference}
                      onClick={() => onAnimeClick?.(item)}
                    />
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-white/30">
                    <p className="text-lg font-medium">No episodes scheduled</p>
                    <p className="text-sm mt-1">Check back later for updates</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
