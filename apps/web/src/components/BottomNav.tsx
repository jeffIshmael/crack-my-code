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
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] z-[100] flex justify-center px-4 pb-8 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="theme-bottom-nav pointer-events-auto flex items-center justify-between px-2 py-3 backdrop-blur-xl"
        style={{ width: '100%', maxWidth: '380px' }}
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
                  className="absolute inset-0 flex flex-col items-center justify-center p-1"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                >
                  <div className="h-full w-full rounded-full bg-white/5" />
                  <motion.div
                    layoutId="active-dot"
                    className="theme-bottom-nav__active-dot absolute bottom-[-1px] h-1.5 w-1.5 rounded-full shadow-[0_0_8px_var(--accent-glow)]"
                  />
                </motion.div>
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
