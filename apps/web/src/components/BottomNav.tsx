'use client';

import { motion } from 'framer-motion';
import { Home, LayoutGrid, Info, Settings, Trophy } from 'lucide-react';

export type NavTab =
  | 'home'
  | 'games'
  | 'leaderboard'
  | 'about'
  | 'wallet'
  | 'stats'
  | 'terms'
  | 'privacy'
  | 'contact';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  visible: boolean;
}

export function BottomNav({ activeTab, onTabChange, visible }: BottomNavProps) {
  if (!visible) return null;

  const tabs = [
    { id: 'games' as const, label: 'Open', icon: LayoutGrid },
    { id: 'home' as const, label: 'Home', icon: Home },
    { id: 'leaderboard' as const, label: 'Ranks', icon: Trophy },
    { id: 'about' as const, label: 'About', icon: Info },
    { id: 'wallet' as const, label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-1/2 z-[100] flex w-full max-w-[440px] -translate-x-1/2 justify-center px-4 pb-[max(0.65rem,env(safe-area-inset-bottom))] pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="theme-bottom-nav pointer-events-auto flex w-full max-w-[400px] items-center justify-between px-2 py-2.5 backdrop-blur-xl"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-1 flex-col items-center justify-center py-2"
            >
              {isActive && (
                <motion.div
                  layoutId="active-tab"
                  className="theme-bottom-nav__active-pill absolute inset-1"
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.55 }}
                />
              )}
              <Icon
                size={22}
                className={`relative z-10 transition-colors duration-200 ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
                }`}
              />
              <span
                className={`relative z-10 mt-1 text-[9px] font-bold uppercase tracking-wide transition-colors duration-200 ${
                  isActive ? 'text-[var(--accent)]' : 'text-[var(--text-dim)]'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </motion.div>
    </div>
  );
}
