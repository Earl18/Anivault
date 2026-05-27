'use client';

import { useEffect, useRef, useState } from 'react';
import { Home, Search, Calendar, Settings, ChevronLeft, ChevronRight, Lock, LockOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const navItems = [
  { icon: Home, label: 'Home', id: 'home' },
  { icon: Search, label: 'Search', id: 'search' },
  { icon: Calendar, label: 'Schedule', id: 'schedule' },
  { icon: Settings, label: 'Settings', id: 'settings' },
];

// Index before which to insert a separator (between schedule and settings)
const SEPARATOR_AFTER = 2;

interface SideDockProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export function SideDock({ activeView = 'home', onViewChange }: SideDockProps) {
  const [visible, setVisible] = useState(false);
  const [isLockedHidden, setIsLockedHidden] = useState(false);
  const [isScrollHidden, setIsScrollHidden] = useState(false);
  const scrollHideTimeoutRef = useRef<number | null>(null);
  const visibleRef = useRef(visible);

  const active = activeView === 'search' ? 'search' : activeView;
  const activeIndex = navItems.findIndex(item => item.id === active);

  const handleItemClick = (id: string) => {
    if (onViewChange) {
      onViewChange(id);
    }
  };

  useEffect(() => {
    visibleRef.current = visible;
  }, [visible]);

  useEffect(() => {
    const clearScrollHideTimeout = () => {
      if (scrollHideTimeoutRef.current !== null) {
        window.clearTimeout(scrollHideTimeoutRef.current);
        scrollHideTimeoutRef.current = null;
      }
    };

    const handleScroll = () => {
      if (visibleRef.current) {
        setVisible(false);
        setIsScrollHidden(false);
        clearScrollHideTimeout();
        return;
      }

      setIsScrollHidden(true);
      clearScrollHideTimeout();
      scrollHideTimeoutRef.current = window.setTimeout(() => {
        setIsScrollHidden(false);
        scrollHideTimeoutRef.current = null;
      }, 180);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      clearScrollHideTimeout();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <>
      {/* Main dock */}
      <AnimatePresence>
        {visible && (
          <motion.aside
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: isScrollHidden ? -96 : 0, opacity: isScrollHidden ? 0 : 1 }}
            exit={{ x: -80, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="hidden lg:flex fixed left-4 top-1/2 -translate-y-1/2 z-[9999]"
          >
            <div
              role="toolbar"
              aria-label="Navigation dock"
              className="relative flex flex-col items-center gap-3 rounded-full border border-white/[0.08] bg-[#050505]/90 p-3 shadow-2xl backdrop-blur-3xl"
            >
              {/* Active indicator pill */}
              {activeIndex >= 0 && (
                <div
                  className="absolute left-3 z-0 h-[42px] w-[42px] rounded-full border border-white/5 bg-white/[0.08] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)] transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  style={{ top: '12px', transform: `translateY(${activeIndex * 54}px)` }}
                >
                  <div className="absolute top-1/2 -left-3 h-1/2 w-[3px] -translate-y-1/2 rounded-r-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
                </div>
              )}

              {/* Navigation items */}
              {navItems.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  className={`group relative z-10 flex size-[42px] items-center justify-center rounded-full transition-all duration-300 ${
                    active === item.id
                      ? 'text-white'
                      : 'text-white/40 hover:bg-white/5 hover:text-white/90'
                  }`}
                  title={item.label}
                >
                  <div className="relative z-10 flex items-center justify-center">
                    <item.icon className={`size-[20px] transition-transform duration-300 group-hover:scale-110 ${active === item.id ? 'text-primary' : ''}`} />
                  </div>

                  {/* Tooltip */}
                  <div
                    className="pointer-events-none absolute left-full z-50 ml-4 rounded-lg border border-white/[0.08] bg-[#050505]/90 px-3 py-1.5 text-[11px] font-semibold tracking-wide whitespace-nowrap text-white opacity-0 shadow-2xl backdrop-blur-3xl transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1 group-hover:opacity-100"
                  >
                    {item.label}
                  </div>
                </button>
              ))}

              {/* Separator */}
              <div className="h-px w-6 bg-white/[0.08]" />

              {/* Hide dock */}
              <button
                onClick={() => setVisible(false)}
                className="group relative z-10 flex size-11 items-center justify-center rounded-lg text-gray-400 transition-all duration-300 hover:bg-white/10 hover:text-white"
                title="Hide dock"
              >
                <ChevronLeft className="size-5 transition-all duration-300 group-hover:scale-110" />
                <div
                  className="pointer-events-none absolute left-full z-50 ml-3 rounded-lg border border-white/[0.08] bg-[#050505]/90 px-2.5 py-1.5 text-xs whitespace-nowrap text-white opacity-0 shadow-lg backdrop-blur-3xl transition-all duration-200 group-hover:translate-x-0.5 group-hover:opacity-100"
                >
                  Hide
                </div>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Show dock button (when hidden) */}
      <AnimatePresence>
        {!visible && (
          <motion.div
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: isScrollHidden ? -48 : 0, opacity: isScrollHidden ? 0 : 1 }}
            exit={{ x: -40, opacity: 0 }}
            className="hidden lg:flex fixed top-1/2 left-0 z-40 -translate-y-1/2 flex-col items-start gap-0.5"
          >
            <button
              onClick={() => {
                if (!isLockedHidden) {
                  setVisible(true);
                }
              }}
              aria-disabled={isLockedHidden}
              className={`flex h-20 w-8 items-center justify-center rounded-r-lg border-y border-r border-white/[0.08] bg-[#050505]/90 shadow-lg backdrop-blur-3xl transition-all duration-500 ease-out ${
                isLockedHidden
                  ? 'cursor-not-allowed text-white/20'
                  : 'text-gray-400 hover:w-10 hover:bg-[#050505]/98 hover:text-white'
              }`}
            >
              <ChevronRight className="size-5" />
            </button>
            <button
              onClick={() => {
                setIsLockedHidden((current) => {
                  const next = !current;
                  if (next) {
                    setVisible(false);
                  }
                  return next;
                });
              }}
              className={`flex h-8 w-8 items-center justify-center rounded-r-lg border-y border-r border-white/[0.08] bg-[#050505]/90 shadow-lg backdrop-blur-3xl transition-all duration-300 hover:w-10 hover:bg-[#050505]/98 ${
                isLockedHidden ? 'text-primary' : 'text-gray-400 hover:text-white'
              }`}
              title={isLockedHidden ? 'Unlock dock' : 'Lock dock hidden'}
            >
              {isLockedHidden ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
