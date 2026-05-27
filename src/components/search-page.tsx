'use client';

import { useState, useMemo, useEffect, useRef, useDeferredValue, useCallback } from 'react';
import { Search, Star, Plus, ChevronDown, ChevronLeft, ChevronRight, X, Filter, RotateCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SearchAnimeItem } from '@/lib/anime-data';
import { fetchAnimeSearch, fetchAnimeSearchFacets, type SearchFacets } from '@/lib/anime-client';
import { MarqueeTitle } from '@/components/ui/marquee-title';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

const ITEMS_PER_PAGE = 36;
const RESULT_COUNT_ANIMATION_MS = 450;

const fixedSeasonOptions = ['Winter', 'Spring', 'Summer', 'Fall'];
const fixedFormatOptions = ['TV', 'Movie', 'Special', 'OVA', 'ONA', 'Music'];
const fixedStatusOptions = ['Finished', 'Releasing', 'Not Yet Released'];
const fixedSortOptions = ['Popularity', 'Score', 'Year'];
const emptySearchFacets: SearchFacets = {
  genres: [],
  years: [],
  seasons: [],
  formats: [],
  statuses: [],
  studios: [],
};

function mapSortLabelToQuery(value: string | null) {
  switch (value?.toLowerCase()) {
    case 'popularity':
      return 'popular';
    case 'score':
      return 'score';
    case 'year':
      return 'latest';
    default:
      return undefined;
  }
}

function getStatusTone(status?: string | null) {
  const value = status?.toLowerCase() ?? '';

  if (value.includes('not') || value.includes('upcoming')) {
    return 'upcoming';
  }

  if (value.includes('finished') || value.includes('complete')) {
    return 'finished';
  }

  if (value.includes('air') || value.includes('releas')) {
    return 'airing';
  }

  return 'unknown';
}

function SearchAnimeCard({
  anime,
  titlePreference,
  onClick,
}: {
  anime: SearchAnimeItem;
  titlePreference: TitlePreference;
  onClick?: () => void;
}) {
  const displayTitle = getPreferredTitle(anime, titlePreference);
  const statusTone = getStatusTone(anime.status);

  return (
    <div onClick={onClick} className="group block hover:-translate-y-1 transition-transform duration-200 cursor-pointer">
      {/* Cover Image */}
      <div className="relative mb-3 aspect-[3/4] w-full">
        <div className="absolute inset-0 overflow-hidden rounded-lg bg-zinc-900 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]">
          <img
            loading="lazy"
            src={anime.coverImage}
            alt={anime.title}
            className="h-full w-full object-cover transition-opacity duration-300"
          />

          {/* Watchlist button - top right */}
          <div className="absolute top-1.5 right-1.5 z-30 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-150">
            <button
              className="flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition-all hover:bg-black/80"
              aria-label="Add to Watchlist"
              onClick={(e) => e.preventDefault()}
            >
              <Plus className="size-4" />
            </button>
          </div>

          {/* Score + Format badge - top left */}
          <span className="absolute top-2 left-2 flex h-5 items-center gap-1.5 rounded-full border border-white/10 bg-black/80 px-1.5 text-[10px] font-medium text-white backdrop-blur-sm">
            <div className="flex items-center gap-1 border-r border-white/10 pr-1.5">
              <Star className="size-2.5 fill-amber-400 text-amber-400" />
              <span>{anime.score.toFixed(1)}</span>
            </div>
            <span className="pl-0">{anime.format}</span>
          </span>

          {/* Sub/Dub badge - bottom right */}
          <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1">
            {anime.subDub === 'both' ? (
              <>
                <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/30">SUB</span>
                <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/30">DUB</span>
              </>
            ) : anime.subDub === 'dub' ? (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/30">DUB</span>
            ) : (
              <span className="px-1 py-0.5 rounded text-[9px] font-bold bg-primary/20 text-primary border border-primary/30">SUB</span>
            )}
          </div>

          {/* Episode count - bottom left */}
          {anime.episodes && (
            <span className="absolute bottom-1.5 left-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 backdrop-blur-sm text-white/70">
              EP {anime.episodes}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <MarqueeTitle
        text={displayTitle}
        className="text-sm font-semibold text-white group-hover:text-primary transition-colors leading-tight"
      />

      {/* Year + Status */}
      <div className="flex items-center gap-1.5 mt-1 text-xs text-white/40">
        <span>{anime.year}</span>
        <span className="text-white/20">·</span>
        <span className={statusTone === 'airing' ? 'text-primary' : 'text-white/40'}>
          {anime.status}
        </span>
      </div>
    </div>
  );
}

function SearchAnimeCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative mb-3 aspect-[3/4] w-full overflow-hidden rounded-lg bg-zinc-900/80">
        <div className="absolute inset-0 bg-[linear-gradient(110deg,rgba(255,255,255,0.03),rgba(255,255,255,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%] animate-[shine_1.4s_linear_infinite]" />
      </div>
      <div className="h-4 w-full rounded bg-zinc-900/80" />
      <div className="mt-2 h-3 w-2/3 rounded bg-zinc-900/60" />
    </div>
  );
}

/* ── Sidebar Filter Accordion ── */
function SidebarFilter({
  title,
  options,
  selected,
  onSelect,
}: {
  title: string;
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2 text-white backdrop-blur-sm transition-all duration-200 hover:border-white/[0.15] hover:bg-white/[0.06]">
      <button
        className="flex w-full items-center justify-between text-lg font-semibold transition-colors duration-200 focus:outline-none"
        onClick={() => setExpanded(!expanded)}
      >
        {title}
        <ChevronDown className={`size-4 transition-transform duration-300 ${expanded ? '-rotate-90' : ''}`} />
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="mb-1 space-y-2 pt-3 pb-1">
              {options.map((opt) => (
                <li key={opt}>
                  <label className="group flex cursor-pointer items-center space-x-3">
                    <input
                      type="radio"
                      name={`radio-${title}`}
                      checked={selected === opt}
                      onChange={() => onSelect(selected === opt ? null : opt)}
                      className="h-4 w-4 cursor-pointer border-zinc-700 bg-zinc-800 text-primary accent-primary"
                    />
                    <span className="text-sm font-medium text-gray-300 transition-colors duration-150 group-hover:text-white">
                      {opt}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Dropdown Filter (for top bar) ── */
function DropdownFilter({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <div className="mb-1 text-lg font-semibold">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-[210px] items-center justify-between rounded-[10px] bg-zinc-900 py-2.5 pr-3 pl-3 text-sm font-medium text-gray-300 transition-all duration-200 focus:outline-none hover:bg-zinc-800"
        type="button"
      >
        <span className="mr-0.5 line-clamp-1">{selected || 'Any'}</span>
        <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 z-50 mt-1 max-h-80 w-[210px] overflow-y-auto rounded-lg border border-white/[0.08] bg-[#050505]/98 py-1 shadow-2xl backdrop-blur-3xl custom-scrollbar"
            >
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="flex w-full items-center px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Any
              </button>
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options yet
                </div>
              ) : null}
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onSelect(opt); setOpen(false); }}
                  className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${selected === opt ? 'text-primary bg-primary/5' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function SearchableDropdownFilter({
  label,
  options,
  selected,
  onSelect,
  placeholder,
  columns = 1,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
  placeholder: string;
  columns?: 1 | 2;
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const filteredOptions = useMemo(() => {
    const normalized = searchValue.trim().toLowerCase();
    if (!normalized) {
      return options;
    }

    return options.filter((option) => option.toLowerCase().includes(normalized));
  }, [options, searchValue]);

  useEffect(() => {
    if (!open) {
      setSearchValue('');
    }
  }, [open]);

  return (
    <div className="relative">
      <div className="mb-1 text-lg font-semibold">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-[210px] items-center justify-between rounded-[14px] border px-4 py-2.5 text-sm font-medium transition-all duration-200 focus:outline-none ${
          open
            ? 'border-primary/70 bg-zinc-900 text-white shadow-[0_0_0_1px_rgba(148,255,0,0.18)]'
            : 'border-white/[0.08] bg-zinc-900 text-gray-300 hover:bg-zinc-800'
        }`}
        type="button"
      >
        <span className="mr-0.5 line-clamp-1">{selected || 'Any'}</span>
        <ChevronDown className={`size-4 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 z-50 mt-2 w-[210px] overflow-hidden rounded-[14px] border border-primary/30 bg-[#090909]/98 shadow-[0_20px_60px_rgba(0,0,0,0.55)] backdrop-blur-3xl"
            >
              <div className="border-b border-white/[0.05] p-3">
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-[10px] border border-white/[0.05] bg-[#171922] px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-primary/35"
                />
              </div>
              <div className="max-h-[280px] overflow-y-auto px-3 py-3 custom-scrollbar">
                <button
                  onClick={() => {
                    onSelect(null);
                    setOpen(false);
                  }}
                  className="mb-2 w-full rounded-[10px] px-3 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-white/5 hover:text-white"
                  type="button"
                >
                  Any
                </button>
                {filteredOptions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No options found</div>
                ) : (
                  <div className={`grid gap-2 ${columns === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    {filteredOptions.map((option) => (
                      <button
                        key={option}
                        onClick={() => {
                          onSelect(option);
                          setOpen(false);
                        }}
                        className={`rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
                          selected === option
                            ? 'bg-primary/14 text-primary'
                            : 'text-gray-200 hover:bg-white/5 hover:text-white'
                        }`}
                        type="button"
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function YearDropdownFilter({
  options,
  selected,
  onSelect,
}: {
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}) {
  return (
    <SearchableDropdownFilter
      label="Year"
      options={options}
      selected={selected}
      onSelect={onSelect}
      placeholder="Search year..."
      columns={2}
    />
  );
}

/* ── Mobile Filter Dropdown ── */
function MobileDropdownFilter({
  label,
  options,
  selected,
  onSelect,
}: {
  label: string;
  options: string[];
  selected: string | null;
  onSelect: (val: string | null) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-full">
      <div className="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">{label}</div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-lg border border-white/5 bg-[#111119] px-3 py-2.5 text-sm font-medium text-gray-300 transition-colors focus:outline-none hover:bg-[#181821]"
        type="button"
      >
        <span className="line-clamp-1">{selected || `Select ${label}`}</span>
        <ChevronDown className={`size-3.5 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 z-50 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-white/[0.08] bg-[#050505]/98 py-1 shadow-2xl backdrop-blur-3xl custom-scrollbar"
            >
              <button
                onClick={() => { onSelect(null); setOpen(false); }}
                className="flex w-full items-center px-3 py-2 text-sm text-gray-400 hover:bg-white/5 hover:text-white"
              >
                Any
              </button>
              {options.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No options yet
                </div>
              ) : null}
              {options.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { onSelect(opt); setOpen(false); }}
                  className={`flex w-full items-center px-3 py-2 text-sm transition-colors ${selected === opt ? 'text-primary bg-primary/5' : 'text-gray-300 hover:bg-white/5 hover:text-white'}`}
                >
                  {opt}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SearchPageProps {
  onClose: () => void;
  onAnimeClick?: (anime: SearchAnimeItem) => void;
  initialQuery?: string;
  initialFacets?: SearchFacets;
  titlePreference: TitlePreference;
}

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnimeClick?: (anime: SearchAnimeItem) => void;
  onViewAll?: (query: string) => void;
  titlePreference: TitlePreference;
}

function QuickSearchRow({
  anime,
  titlePreference,
  onClick,
}: {
  anime: SearchAnimeItem;
  titlePreference: TitlePreference;
  onClick?: () => void;
}) {
  const displayTitle = getPreferredTitle(anime, titlePreference);

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-white/[0.06] px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
      type="button"
    >
      <img
        src={anime.coverImage}
        alt={anime.title}
        className="h-14 w-11 rounded-md object-cover"
        loading="lazy"
      />
      <div className="min-w-0 flex-1">
        <MarqueeTitle text={displayTitle} className="text-lg font-semibold text-white" />
        <p className="mt-1 text-sm text-white/45">
          {anime.format} · {anime.status} · {anime.year}
        </p>
      </div>
      <ChevronRight className="size-4 shrink-0 text-white/30" />
    </button>
  );
}

export function QuickSearchModal({
  isOpen,
  onClose,
  onAnimeClick,
  onViewAll,
  titlePreference,
}: QuickSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchAnimeItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const focusTimer = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleClose, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedQuery = query.trim();

    if (!normalizedQuery) {
      setResults([]);
      return;
    }

    let isCancelled = false;
    void (async () => {
      try {
        const payload = await fetchAnimeSearch({
          query: normalizedQuery,
          perPage: 10,
          quick: true,
        });
        if (!isCancelled) {
          setResults(payload.items.slice(0, 10));
        }
      } catch {
        if (!isCancelled) {
          setResults([]);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, query]);

  const hasQuery = query.trim().length > 0;
  const visibleResults = hasQuery ? results : [];
  const hasMatches = visibleResults.length > 0;

  if (!isOpen) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[11000] flex items-center justify-center bg-black/75 px-3 py-4 backdrop-blur-md sm:px-6 sm:py-8"
      >
        <button
          aria-label="Close quick search"
          className="absolute inset-0 cursor-default"
          onClick={handleClose}
          type="button"
        />

        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 18, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative mx-auto flex w-full max-w-3xl -translate-y-8 flex-col"
        >
          <div className="flex items-center justify-between px-2 pt-4 text-sm font-semibold text-white/90 sm:px-3">
            <div className="flex items-center gap-2">
              <span>For quick access :</span>
              <kbd className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-bold tracking-wide text-white">ALT</kbd>
              <span className="text-white/40">+</span>
              <kbd className="rounded-md border border-white/10 bg-white/10 px-2 py-1 text-xs font-bold tracking-wide text-white">S</kbd>
            </div>
            <button
              onClick={handleClose}
              className="rounded-md p-1.5 text-white/45 transition-colors hover:bg-white/5 hover:text-white"
              type="button"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="px-2 pt-3 sm:px-3">
            <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#181821] shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
              <div className="relative px-4 py-3">
                <Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search anime..."
                  className="w-full rounded-lg bg-transparent py-1 pl-8 pr-2 text-xl font-medium text-white outline-none placeholder:text-white/25"
                />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {hasQuery && hasMatches && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="mt-3 min-h-0 px-2 pb-4 sm:px-3"
              >
                <div className="max-h-[58vh] overflow-y-auto rounded-xl border border-white/[0.08] bg-[linear-gradient(180deg,rgba(139,92,246,0.06),rgba(5,5,5,0.25))] shadow-[0_20px_80px_rgba(0,0,0,0.45)] custom-scrollbar">
                <>
                  {visibleResults.map((anime) => (
                    <QuickSearchRow
                      key={anime.id}
                      anime={anime}
                      titlePreference={titlePreference}
                      onClick={() => {
                        onAnimeClick?.(anime);
                        handleClose();
                      }}
                    />
                  ))}
                  <button
                    onClick={() => {
                      onViewAll?.(query);
                      handleClose();
                    }}
                    className="flex w-full items-center justify-center gap-2 px-4 py-4 text-sm font-bold text-primary transition-colors hover:bg-white/[0.03] hover:text-white"
                    type="button"
                  >
                    View All Results ({visibleResults.length})
                    <ChevronRight className="size-4" />
                  </button>
                </>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function SearchPage({
  onClose,
  onAnimeClick,
  initialQuery = '',
  initialFacets = emptySearchFacets,
  titlePreference,
}: SearchPageProps) {
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedStudio, setSelectedStudio] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [remoteAnime, setRemoteAnime] = useState<SearchAnimeItem[]>([]);
  const [visibleAnime, setVisibleAnime] = useState<SearchAnimeItem[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [animatedTotalResults, setAnimatedTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogFacets, setCatalogFacets] = useState<SearchFacets>(initialFacets ?? emptySearchFacets);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const currentOffset = (currentPage - 1) * ITEMS_PER_PAGE;

  const genreOptions = useMemo(() => catalogFacets.genres, [catalogFacets.genres]);
  const yearOptions = useMemo(() => catalogFacets.years, [catalogFacets.years]);
  const studioOptions = useMemo(() => catalogFacets.studios, [catalogFacets.studios]);
  const seasonOptions = useMemo(() => fixedSeasonOptions, []);
  const formatOptions = useMemo(() => fixedFormatOptions, []);
  const statusOptions = useMemo(() => fixedStatusOptions, []);
  const sortOptions = useMemo(() => fixedSortOptions, []);
  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedGenre !== null ||
    selectedYear !== null ||
    selectedSeason !== null ||
    selectedFormat !== null ||
    selectedStatus !== null ||
    selectedTag !== null ||
    selectedStudio !== null;
  const beginLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  useEffect(() => {
    if (
      initialFacets.genres.length > 0 ||
      initialFacets.years.length > 0 ||
      initialFacets.studios.length > 0
    ) {
      return;
    }

    let isCancelled = false;

    void (async () => {
      try {
        const payload = await fetchAnimeSearchFacets();
        if (!isCancelled) {
          setCatalogFacets(payload.facets);
        }
      } catch {
        if (!isCancelled) {
          setCatalogFacets({
            genres: [],
            years: [],
            seasons: [],
            formats: [],
            statuses: [],
            studios: [],
          });
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [initialFacets]);

  useEffect(() => {
    const target = totalResults;
    const start = animatedTotalResults;

    if (start === target) {
      return;
    }

    const startedAt = performance.now();
    let frameId = 0;

    const animate = (now: number) => {
      const elapsed = now - startedAt;
      const progress = Math.min(elapsed / RESULT_COUNT_ANIMATION_MS, 1);
      const nextValue = Math.round(start + (target - start) * progress);
      setAnimatedTotalResults(nextValue);

      if (progress < 1) {
        frameId = window.requestAnimationFrame(animate);
      }
    };

    frameId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frameId);
  }, [totalResults]);

  useEffect(() => {
    setVisibleAnime(remoteAnime);
  }, [remoteAnime]);

  useEffect(() => {
    let isCancelled = false;

    const run = async () => {
      try {
        const payload = await fetchAnimeSearch({
          query: deferredSearchQuery,
          genre: selectedGenre,
          year: selectedYear,
          season: selectedSeason,
          format: selectedFormat,
          status: selectedStatus,
          tag: mapSortLabelToQuery(selectedTag),
          studio: selectedStudio,
          limit: ITEMS_PER_PAGE,
          offset: currentOffset,
          includeFacets: false,
        });

        if (!isCancelled) {
          setVisibleAnime([]);
          setRemoteAnime(payload.items);
          if (payload.items.length === 0) {
            setVisibleAnime([]);
          }
          setTotalResults(payload.total);
          setIsLoading(false);
        }
      } catch {
        if (!isCancelled) {
          setRemoteAnime([]);
          setVisibleAnime([]);
          setTotalResults(0);
          setAnimatedTotalResults(0);
          setIsLoading(false);
        }
      }
    };

    void run();

    return () => {
      isCancelled = true;
    };
  }, [
    deferredSearchQuery,
    selectedFormat,
    selectedGenre,
    selectedSeason,
    selectedStatus,
    selectedStudio,
    selectedTag,
    selectedYear,
    currentOffset,
  ]);

  const totalPages = Math.max(1, Math.ceil(totalResults / ITEMS_PER_PAGE));
  const displayItems = visibleAnime;
  const shouldShowSkeletons = isLoading && displayItems.length === 0;

  const handleReset = () => {
    beginLoading();
    setSearchQuery('');
    setSelectedGenre(null);
    setSelectedYear(null);
    setSelectedSeason(null);
    setSelectedFormat(null);
    setSelectedStatus(null);
    setSelectedTag(null);
    setSelectedStudio(null);
    setCurrentPage(1);
  };

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen bg-black text-white"
    >
      {/* Mobile Filters - Top */}
      <div className="border-b border-gray-800/50 px-4 pt-4 pb-4 lg:hidden">
        <div className="mb-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {/* Search Input */}
            <div className="relative col-span-2 w-full">
              <div className="mb-1.5 pl-1 text-[13px] font-bold tracking-wide text-white">Search Anime</div>
              <form className="relative w-full" onSubmit={(e) => e.preventDefault()}>
                <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
                  <Search className="size-3.5 text-gray-500" />
                </div>
                <input
                  className="block w-full rounded-lg border border-white/5 bg-[#111119] px-4 py-2.5 ps-9 text-sm font-medium text-gray-300 placeholder-gray-500 transition-colors focus:border-primary/50 focus:outline-none"
                  placeholder="Type to search..."
                  autoComplete="off"
                  type="search"
                  value={searchQuery}
                  onChange={(e) => { beginLoading(); setSearchQuery(e.target.value); setCurrentPage(1); }}
                />
              </form>
            </div>

            {/* Mobile Dropdowns */}
            <MobileDropdownFilter label="Genres" options={genreOptions} selected={selectedGenre} onSelect={(v) => { beginLoading(); setSelectedGenre(v); setCurrentPage(1); }} />
            <MobileDropdownFilter label="Year" options={yearOptions} selected={selectedYear} onSelect={(v) => { beginLoading(); setSelectedYear(v); setCurrentPage(1); }} />
            <MobileDropdownFilter label="Status" options={statusOptions} selected={selectedStatus} onSelect={(v) => { beginLoading(); setSelectedStatus(v); setCurrentPage(1); }} />
            <MobileDropdownFilter label="Format" options={formatOptions} selected={selectedFormat} onSelect={(v) => { beginLoading(); setSelectedFormat(v); setCurrentPage(1); }} />
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-3 px-1 pb-1.5 text-center text-[11px] font-medium tracking-wide text-gray-400">
            <span>Apply</span>
            <span>Reset</span>
            <span>Expand</span>
          </div>
          <div className="flex h-[42px] w-full items-center divide-x divide-white/5 overflow-hidden rounded-lg border border-white/5 bg-[#111]">
            <button className="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Apply">
              <Filter className="size-4" />
            </button>
            <button onClick={handleReset} className="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Reset">
              <RotateCcw className="size-4" />
            </button>
            <button className="flex h-full flex-1 items-center justify-center text-white/70 transition-colors hover:bg-white/5 hover:text-white active:scale-95" aria-label="Expand">
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Top Filter Bar */}
      <div className="hidden flex-row gap-6 border-b border-gray-800/50 p-4 lg:flex">
        <div>
          <h3 className="mb-1 text-lg font-semibold">Search</h3>
          <form className="relative rounded-xl" onSubmit={(e) => e.preventDefault()}>
            <div className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3">
              <Search className="size-4 text-gray-400" />
            </div>
            <input
              className="block w-[220px] rounded-xl bg-zinc-900 px-4 py-2.5 ps-10 text-sm font-medium text-white/90 placeholder-gray-400 transition-colors duration-200 outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="Search"
              autoComplete="off"
              type="search"
              value={searchQuery}
              onChange={(e) => { beginLoading(); setSearchQuery(e.target.value); setCurrentPage(1); }}
            />
          </form>
        </div>
        <SearchableDropdownFilter
          label="Genres"
          options={genreOptions}
          selected={selectedGenre}
          onSelect={(v) => { beginLoading(); setSelectedGenre(v); setCurrentPage(1); }}
          placeholder="Search genre..."
        />
        <YearDropdownFilter options={yearOptions} selected={selectedYear} onSelect={(v) => { beginLoading(); setSelectedYear(v); setCurrentPage(1); }} />
        <SearchableDropdownFilter
          label="Studio"
          options={studioOptions}
          selected={selectedStudio}
          onSelect={(v) => { beginLoading(); setSelectedStudio(v); setCurrentPage(1); }}
          placeholder="Search studio..."
        />
        {hasActiveFilters ? (
          <div className="flex items-end pb-2">
            <button
              type="button"
              aria-label="Reset filters"
              onClick={handleReset}
              className="text-primary transition-all duration-200 hover:text-white"
            >
              <Trash2 className="size-5" />
            </button>
          </div>
        ) : null}
      </div>

      {/* Main Content Area */}
      <div className="flex h-full w-full flex-row gap-6 px-4 mt-6">
        {/* Desktop Sidebar */}
        <div className="hidden min-w-[220px] flex-col gap-4 lg:flex">
          <SidebarFilter title="Season" options={seasonOptions} selected={selectedSeason} onSelect={(v) => { beginLoading(); setSelectedSeason(v); setCurrentPage(1); }} />
          <SidebarFilter title="Format" options={formatOptions} selected={selectedFormat} onSelect={(v) => { beginLoading(); setSelectedFormat(v); setCurrentPage(1); }} />
          <SidebarFilter title="Status" options={statusOptions} selected={selectedStatus} onSelect={(v) => { beginLoading(); setSelectedStatus(v); setCurrentPage(1); }} />
          <SidebarFilter title="Sort by" options={sortOptions} selected={selectedTag} onSelect={(v) => { beginLoading(); setSelectedTag(v); setCurrentPage(1); }} />
        </div>

        {/* Grid + Pagination */}
        <div className="flex-1 min-w-0">
          {/* Results count */}
          <div className="mb-4 text-sm text-gray-400">
            <span className="tabular-nums">{animatedTotalResults.toLocaleString()}</span> results found
          </div>

          {/* Anime Grid */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fill,minmax(130px,1fr))] md:grid-cols-[repeat(auto-fill,minmax(150px,1fr))] xl:grid-cols-[repeat(auto-fill,minmax(165px,1fr))]">
            {shouldShowSkeletons
              ? Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
                  <SearchAnimeCardSkeleton key={`skeleton-${index}`} />
                ))
              : null}
            {displayItems.map((anime) => (
              <SearchAnimeCard
                key={anime.id}
                anime={anime}
                titlePreference={titlePreference}
                onClick={() => onAnimeClick?.(anime)}
              />
            ))}
          </div>

          {/* Empty State */}
          {!isLoading && displayItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-white/30">
              <Search className="size-12 mb-4" />
              <p className="text-lg font-medium">No results found</p>
              <p className="text-sm mt-1">Try adjusting your filters or search query</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="my-5 flex justify-center">
              <div className="flex items-center gap-2">
                <button
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() => { beginLoading(); setCurrentPage((p) => Math.max(1, p - 1)); }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
                    currentPage === 1
                      ? 'cursor-not-allowed bg-zinc-800/50 text-white/40'
                      : 'bg-zinc-800 text-white/80 hover:bg-zinc-700'
                  }`}
                >
                  <ChevronLeft className="size-4" />
                </button>

                {getPageNumbers().map((page, i) => (
                  typeof page === 'number' ? (
                    <button
                      key={i}
                      onClick={() => { beginLoading(); setCurrentPage(page); }}
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
                        currentPage === page
                          ? 'bg-primary text-black'
                          : 'bg-zinc-800 text-white/80 hover:bg-zinc-700'
                      }`}
                    >
                      {page}
                    </button>
                  ) : (
                    <span key={i} className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium text-white/80">
                      ...
                    </span>
                  )
                ))}

                <button
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() => { beginLoading(); setCurrentPage((p) => Math.min(totalPages, p + 1)); }}
                  className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-medium transition-all duration-200 ${
                    currentPage >= totalPages
                      ? 'cursor-not-allowed bg-zinc-800/50 text-white/40'
                      : 'bg-zinc-800 text-white/80 hover:bg-zinc-700'
                  }`}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
