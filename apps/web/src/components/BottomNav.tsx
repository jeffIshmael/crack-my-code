'use client';

import { motion } from 'framer-motion';
import { Home, LayoutGrid, Info } from 'lucide-react';

export type NavTab = 'home' | 'games' | 'about';

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
    { id: 'about' as const, label: 'About', icon: Info },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center px-4 pb-8 pointer-events-none">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="pointer-events-auto flex items-center justify-between rounded-full border border-white/10 bg-[#030C15]/80 px-2 py-2 backdrop-blur-xl shadow-2xl"
        style={{ width: '100%', maxWidth: '320px' }}
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
                    className="absolute bottom-[-1px] h-1.5 w-1.5 rounded-full bg-[var(--accent)] shadow-[0_0_8px_var(--accent)]"
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
                className={`relative z-10 mt-1 text-[10px] font-bold uppercase tracking-widest transition-colors duration-200 ${
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
