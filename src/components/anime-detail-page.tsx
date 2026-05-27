'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Play,
  Plus,
  Share2,
  Users,
} from 'lucide-react';
import { motion } from 'framer-motion';

import type { Anime } from '@/lib/anime-data';
import { getPreferredTitle, type TitlePreference } from '@/lib/title-preference';

function Divider() {
  return <div className="my-1 h-px bg-white/[0.06]" />;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-xs text-white/40">{label}</span>
      <span className="max-w-[60%] text-right text-xs text-white/75">{value}</span>
    </div>
  );
}

function trimDescription(value?: string) {
  if (!value) {
    return '';
  }

  const markerIndex = value.indexOf('[Written by MAL Rewrite]');
  if (markerIndex >= 0) {
    return value.slice(0, markerIndex).trim();
  }

  return value.trim();
}

export function AnimeDetailPage({
  anime,
  titlePreference,
  onBack,
  onWatchNow,
  onAnimeSelect,
}: {
  anime: Anime;
  titlePreference: TitlePreference;
  onBack?: () => void;
  onWatchNow?: (episode?: number) => void;
  onAnimeSelect?: (anime: Anime) => void;
}) {
  const [descExpanded, setDescExpanded] = useState(false);
  const heroBannerImage = anime.carouselImage?.trim() ? anime.carouselImage : null;
  const displayTitle = getPreferredTitle(anime, titlePreference);
  const displayDescription = useMemo(() => trimDescription(anime.description), [anime.description]);

  const animeStatus = anime.status || 'Unknown';
  const statusValue = animeStatus.toLowerCase();
  const statusColor =
    statusValue.includes('air') || statusValue.includes('releas')
      ? 'text-primary'
      : statusValue.includes('finished') || statusValue.includes('complete')
        ? 'text-sky-400'
        : 'text-amber-300';

  const statusDot =
    statusValue.includes('air') || statusValue.includes('releas')
      ? 'bg-primary'
      : statusValue.includes('finished') || statusValue.includes('complete')
        ? 'bg-sky-400'
        : 'bg-amber-300';

  const alternativeTitles = useMemo(
    () =>
      [anime.nativeTitle, anime.romajiTitle, anime.englishTitle, anime.title].filter(
        (value, index, array): value is string =>
          typeof value === 'string' && value.trim().length > 0 && array.indexOf(value) === index
      ),
    [anime.englishTitle, anime.nativeTitle, anime.romajiTitle, anime.title]
  );

  const metaChips = [
    anime.format || 'TV',
    anime.duration ? `${anime.duration} min` : null,
    animeStatus,
    anime.season && anime.year ? `${anime.season} ${anime.year}` : anime.year ? String(anime.year) : null,
  ].filter((value): value is string => Boolean(value));

  return (
    <div className="min-h-[calc(100dvh-4rem)] bg-background text-foreground">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] overflow-hidden sm:h-[480px] lg:h-[560px]">
          {heroBannerImage ? (
            <img
              src={heroBannerImage}
              alt=""
              className="h-full w-full object-cover"
              style={{ filter: 'blur(2px) brightness(0.34)' }}
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_top,_rgba(132,225,24,0.16),_transparent_34%),linear-gradient(180deg,_rgba(15,23,42,0.9),_rgba(0,0,0,1))]" />
          )}
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.62)_55%,rgba(0,0,0,0.96)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.9)_0%,rgba(0,0,0,0.66)_32%,rgba(0,0,0,0.2)_58%,rgba(0,0,0,0.72)_100%)]" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1720px] px-4 pb-8 pt-8 sm:px-5 lg:px-6 lg:pb-16 xl:px-8 2xl:px-10">
          {onBack && (
            <button
              onClick={onBack}
              className="group mb-6 inline-flex items-center gap-2 text-white/65 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1 group-hover:text-[#84e118]" />
              <span className="text-sm font-medium">Back</span>
            </button>
          )}

          <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:items-start lg:gap-x-7 xl:grid-cols-[280px_minmax(0,1fr)] xl:gap-x-9">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:row-start-1">
              <div className="aspect-[3/4] w-full">
                <img src={anime.coverImage} alt={anime.title} className="h-full w-full object-cover" />
              </div>
            </div>

            <div className="min-w-0 space-y-3 pt-1 lg:row-start-1 lg:flex lg:h-full lg:flex-col lg:pb-10">
                <h1 className="text-[2rem] font-black uppercase tracking-tight text-white sm:text-[2.5rem] lg:text-[2.25rem]">
                  {displayTitle}
                </h1>

                {displayDescription && (
                  <div className="max-w-5xl">
                    <p
                      className={`text-[0.9rem] leading-8 text-muted-foreground ${!descExpanded ? 'line-clamp-4' : ''}`}
                      dangerouslySetInnerHTML={{ __html: displayDescription }}
                    />
                    {displayDescription.length > 150 && (
                      <button
                        onClick={() => setDescExpanded(!descExpanded)}
                        className="mt-2 inline-flex items-center gap-1 text-[0.9rem] font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {descExpanded ? (
                          <>
                            Read Less <ChevronUp className="h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Read More <ChevronDown className="h-4 w-4" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

            </div>

            <div className="rounded-2xl border border-border bg-card/95 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] lg:row-start-2 lg:self-stretch">
              <InfoRow label="Type" value="ANIME" />
              <Divider />
              <InfoRow label="Episodes" value={anime.episodes?.toString() || 'N/A'} />
              <Divider />
              <InfoRow label="Duration" value={anime.duration ? `${anime.duration} min` : 'N/A'} />
              <Divider />
              <InfoRow
                label="Status"
                value={
                  <span className={`flex items-center justify-end gap-1.5 ${statusColor}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                    {animeStatus}
                  </span>
                }
              />
              <Divider />
              <InfoRow label="Start Date" value={anime.startDate || 'Unknown'} />
              <Divider />
              <InfoRow
                label="Season"
                value={
                  anime.season && anime.year
                    ? `${anime.season} ${anime.year}`
                    : anime.season || anime.year?.toString() || 'Unknown'
                }
              />
            </div>

            <div className="space-y-4 lg:row-start-2 lg:self-start">
                <div className="space-y-3">
                  {anime.genre.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {anime.genre.map((genre) => (
                        <span
                          key={genre}
                          className="rounded-full bg-primary/14 px-3 py-1 text-xs font-semibold text-primary"
                        >
                          {genre}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onWatchNow?.()}
                      className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Watch Now
                    </button>
                    <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-foreground/85 transition-colors hover:bg-accent">
                      <Plus className="h-4 w-4" />
                      Add to List
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </button>
                    <button className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 px-4 py-2.5 text-sm font-semibold text-foreground/85 transition-colors hover:bg-accent">
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {metaChips.map((chip) => (
                      <span
                        key={chip}
                        className="rounded-lg border border-border bg-secondary/55 px-3 py-1.5 text-xs font-semibold text-foreground/75"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

            <div className="rounded-[1.35rem] border border-border bg-card/95 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.22)] sm:p-6">
                {alternativeTitles.length > 0 && (
                  <section className="mb-7">
                    <h2 className="mb-4 text-[1.28rem] font-black tracking-tight text-white">Alternative Titles</h2>
                    <div className="flex flex-wrap gap-2">
                      {alternativeTitles.map((title) => (
                        <span
                          key={title}
                          className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground/80"
                        >
                          {title}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                {anime.studios && anime.studios.length > 0 && (
                  <section className="mb-7">
                    <h2 className="mb-4 text-[1.28rem] font-black tracking-tight text-white">Studios</h2>
                    <div className="flex flex-wrap gap-2">
                      {anime.studios.map((studio) => (
                        <span
                          key={studio}
                          className="rounded-md bg-secondary px-3 py-2 text-sm font-medium text-foreground/80"
                        >
                          {studio}
                        </span>
                      ))}
                    </div>
                  </section>
                )}

                <section className="mb-7">
                  <h2 className="mb-4 text-[1.28rem] font-black tracking-tight text-white">Stats</h2>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-2xl bg-secondary px-5 py-4 text-center">
                      <div className="mb-1 text-sm text-muted-foreground">Episodes</div>
                      <div className="text-[1.95rem] font-black text-foreground">{anime.episodes || 'N/A'}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary px-5 py-4 text-center">
                      <div className="mb-1 text-sm text-muted-foreground">Duration</div>
                      <div className="text-[1.95rem] font-black text-foreground">{anime.duration ? `${anime.duration}m` : 'N/A'}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary px-5 py-4 text-center">
                      <div className="mb-1 text-sm text-muted-foreground">Subbed</div>
                      <div className="text-[1.95rem] font-black text-foreground">{anime.subbed || 0}</div>
                    </div>
                    <div className="rounded-2xl bg-secondary px-5 py-4 text-center">
                      <div className="mb-1 text-sm text-muted-foreground">Dubbed</div>
                      <div className="text-[1.95rem] font-black text-foreground">{anime.dubbed || 0}</div>
                    </div>
                  </div>
                </section>

                <section className="mb-7 border-t border-border pt-6">
                  <div className="mb-4 flex items-center gap-2">
                    <div className="flex h-4 w-4 items-center justify-center rounded-[3px] border border-primary text-primary">
                      <div className="h-[2px] w-2.5 rounded-full bg-primary" />
                    </div>
                    <h2 className="text-lg font-black uppercase tracking-tight text-white">
                      Related Seasons &amp; Series
                    </h2>
                  </div>
                  {anime.relations && anime.relations.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {anime.relations.map((rel) => {
                        const relationTone =
                          rel.relationType === 'PREQUEL'
                            ? 'text-primary'
                            : rel.relationType === 'SEQUEL'
                              ? 'text-primary'
                              : rel.relationType === 'PARENT_STORY'
                                ? 'text-primary'
                                : 'text-white/70';

                        const relationLabel =
                          rel.relationType === 'PARENT_STORY' ? 'CURRENT' : rel.relationType;

                        return (
                        <motion.button
                          key={rel.id}
                          type="button"
                          onClick={() =>
                            onAnimeSelect?.({
                              id: rel.id,
                              title: rel.title,
                              englishTitle: rel.englishTitle,
                              romajiTitle: rel.romajiTitle,
                              nativeTitle: undefined,
                              description: '',
                              carouselImage: rel.coverImage || '',
                              coverImage: rel.coverImage || '',
                              score: 0,
                              format: rel.format || 'TV',
                              year: rel.year || 0,
                              genre: [],
                              relations: undefined,
                              malId: rel.malId,
                            })
                          }
                          whileHover={{ y: -2 }}
                          className={`group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 ${
                            rel.relationType === 'PARENT_STORY'
                              ? 'border-primary shadow-[0_0_0_1px_rgba(139,92,246,0.22),0_0_24px_rgba(139,92,246,0.12)]'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <div className="relative h-[74px] overflow-hidden">
                            {rel.coverImage ? (
                              <img
                                src={rel.coverImage}
                                alt={rel.title}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full bg-[linear-gradient(135deg,rgba(139,92,246,0.18),rgba(255,255,255,0.04))]" />
                            )}
                            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[length:8px_8px] opacity-25" />
                            <div className="absolute inset-0 bg-black/35 backdrop-blur-[1.5px]" />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-black/45" />
                          </div>
                          <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
                            <p
                              className={`line-clamp-1 text-[0.95rem] font-black leading-tight ${
                                rel.relationType === 'PARENT_STORY'
                                  ? 'text-primary'
                                  : 'text-white'
                              }`}
                            >
                              {getPreferredTitle(rel, titlePreference)}
                            </p>
                            <div className="mt-1 flex items-center gap-2 text-[0.82rem] font-bold">
                              <span className={relationTone}>{relationLabel}</span>
                              <span className="text-white/55">·</span>
                              <span className="text-white/85">{rel.format || 'TV'}</span>
                              {rel.year ? (
                                <>
                                  <span className="text-white/55">·</span>
                                  <span className="text-white/85">{rel.year}</span>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-border bg-secondary/45 px-4 py-5 text-sm text-muted-foreground">
                      No related seasons found yet.
                    </div>
                  )}
                </section>

                {anime.characters && anime.characters.length > 0 && (
                  <section>
                    <h2 className="mb-4 text-[1.65rem] font-black tracking-tight text-white">Characters</h2>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {anime.characters.map((char, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 rounded-xl border border-border bg-secondary/35 p-3 transition-colors hover:bg-accent"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                            {char.image ? (
                              <img src={char.image} alt={char.name} className="h-full w-full object-cover" />
                            ) : (
                              <Users className="h-4 w-4 text-white/30" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-1 text-sm font-medium text-white/80">{char.name}</p>
                            <p className="text-[10px] uppercase tracking-wider text-white/30">{char.role}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 lg:hidden">
            <div className="rounded-2xl border border-white/[0.06] bg-[#0f1015]/92 p-4">
              <div className="flex flex-wrap gap-3 text-sm text-white/65">
                <span>{anime.format || 'TV'}</span>
                <span className="text-white/20">·</span>
                <span>{anime.duration ? `${anime.duration} min` : 'N/A'}</span>
                <span className="text-white/20">·</span>
                <span className={statusColor}>{animeStatus}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
