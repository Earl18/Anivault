'use client';

import { Home, Search, Calendar, User } from 'lucide-react';
import { motion } from 'framer-motion';

const navItems = [
  { icon: Home, label: 'Home', id: 'home', view: 'home' },
  { icon: Search, label: 'Search', id: 'search', view: 'search' },
  { icon: Calendar, label: 'Schedule', id: 'schedule', view: 'schedule' },
  { icon: User, label: 'Profile', id: 'profile', view: 'settings' },
];

interface MobileNavProps {
  activeView?: string;
  onViewChange?: (view: string) => void;
}

export function MobileNav({ activeView = 'home', onViewChange }: MobileNavProps) {
  const active = activeView === 'search' ? 'search' : activeView;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[10000] border-t border-white/[0.05] bg-[#050505]/95 backdrop-blur-xl safe-area-bottom">
      <div className="flex items-center justify-around h-14 px-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange?.(item.view)}
            className="relative flex flex-col items-center justify-center gap-0.5 flex-1 h-full"
          >
            {active === item.view && (
              <motion.div
                layoutId="mobileActiveIndicator"
                className="absolute -top-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
            <item.icon
              className={`w-5 h-5 transition-colors ${
                active === item.view ? 'text-primary' : 'text-white/40'
              }`}
            />
            <span
              className={`text-[10px] transition-colors ${
                active === item.view ? 'text-primary font-medium' : 'text-white/40'
              }`}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>
      {/* Safe area spacer for iOS */}
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}
