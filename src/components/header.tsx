'use client';

import { useState, useEffect } from 'react';
import { Languages, Search } from 'lucide-react';
import type { TitlePreference } from '@/lib/title-preference';

interface HeaderProps {
  onSearchClick?: () => void;
  onLogoClick?: () => void;
  titlePreference?: TitlePreference;
  onTitlePreferenceChange?: (value: TitlePreference) => void;
}

export function Header({
  onSearchClick,
  onLogoClick,
  titlePreference = 'en',
  onTitlePreferenceChange,
}: HeaderProps) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const titleOptions = [
    { value: 'en' as const, label: 'EN' },
    { value: 'jp' as const, label: 'JP' },
  ];

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[10000] border-b transition-all duration-300"
      style={{
        borderColor: scrolled ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0)',
      }}
    >
      {/* Background with blur */}
      <div
        className="absolute inset-0 z-[-1] bg-black/80 backdrop-blur-2xl transition-opacity duration-300"
        style={{ opacity: scrolled ? 1 : 0 }}
      />

      {/* Left gradient fade */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-[-2] w-64 bg-gradient-to-r from-black/80 to-transparent md:w-[400px] transition-opacity duration-300"
        style={{
          opacity: 1,
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        }}
      />

      {/* Right gradient fade */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-[-2] w-48 bg-gradient-to-l from-black/80 to-transparent md:w-64 transition-opacity duration-300"
        style={{
          opacity: 1,
          maskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 50%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex w-full items-center justify-between py-3 pr-4 pl-6">
        {/* Logo + Search bar */}
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo */}
          <button
            type="button"
            onClick={() => onLogoClick?.()}
            className="group flex items-center -mx-2 sm:-mx-3"
          >
            <img
              src="/anivault-logo.png"
              alt="AniVault"
              className="h-12 w-auto transition-transform duration-300 group-hover:scale-[1.02] sm:h-16"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<span class="text-primary font-bold text-xl tracking-tight">Ani</span><span class="text-white font-bold text-xl tracking-tight">Vault</span>';
                }
              }}
            />
          </button>

          {/* Search bar - desktop */}
          <button
            onClick={() => onSearchClick?.()}
            className="hidden sm:flex min-w-[320px] items-center gap-3 rounded-xl border border-white/20 bg-black/40 px-4 py-2.5 text-left text-gray-300 backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/60 hover:text-white"
            type="button"
          >
            <Search className="w-5 h-5 text-gray-400" />
            <span className="text-base font-medium">Search anime...</span>
            <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
              <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium">Alt</kbd>
              <kbd className="rounded border border-white/20 bg-white/10 px-2 py-1 text-xs font-medium">S</kbd>
            </div>
          </button>

          <div className="hidden sm:flex items-center gap-2 rounded-xl border border-white/20 bg-black/40 px-2 py-1.5 shadow-[0_14px_28px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/60">
            <div className="flex items-center gap-1.5 px-1 text-[10px] font-bold tracking-[0.18em] text-white/42 uppercase">
              <Languages className="h-3.5 w-3.5 text-primary/70" />
              <span>Titles</span>
            </div>
            <div className="relative flex items-center rounded-lg border border-white/[0.06] bg-black/20 p-1">
              {titleOptions.map((option) => {
                const isActive = titlePreference === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => onTitlePreferenceChange?.(option.value)}
                    className={`relative z-10 min-w-[40px] rounded-md px-2.5 py-1.5 text-[11px] font-bold tracking-[0.14em] transition-all ${
                      isActive
                        ? 'bg-white text-[#111827] shadow-[0_10px_24px_rgba(255,255,255,0.12)]'
                        : 'text-white/45 hover:text-white/80'
                    }`}
                    type="button"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search icon - mobile */}
          <button
            onClick={() => onSearchClick?.()}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-2.5 text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-all duration-300 hover:border-white/15 hover:bg-white/[0.06] hover:text-white sm:hidden"
            aria-label="Search"
            type="button"
          >
            <Search className="w-6 h-6" />
          </button>

          <div className="flex sm:hidden items-center gap-1 rounded-xl border border-white/20 bg-black/40 p-1.5 shadow-[0_10px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-sm transition-all duration-300 hover:border-white/40 hover:bg-black/60">
            <Languages className="ml-1 h-3.5 w-3.5 text-primary/70" />
            {titleOptions.map((option) => {
              const isActive = titlePreference === option.value;
              return (
                <button
                  key={option.value}
                  onClick={() => onTitlePreferenceChange?.(option.value)}
                  className={`rounded-md px-2.5 py-1 text-[10px] font-bold tracking-[0.16em] transition-all ${
                    isActive
                      ? 'bg-white text-[#111827] shadow-[0_6px_18px_rgba(255,255,255,0.12)]'
                      : 'text-white/45 hover:text-white'
                  }`}
                  type="button"
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Sign In button */}
          <button
            className="rounded-xl bg-gradient-to-r from-primary to-primary/80 px-4 py-2 text-sm font-medium text-primary-foreground shadow-[0_10px_30px_rgba(139,92,246,0.28)] transition-all duration-300 hover:scale-105"
            type="button"
          >
            Sign In
          </button>
        </div>
      </div>
    </header>
  );
}
