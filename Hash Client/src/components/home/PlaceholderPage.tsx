import React from 'react';
import { motion } from 'framer-motion';
import { Tv, Film, Gamepad2, Bookmark, Search } from 'lucide-react';
import type { TabId } from './HomeNavbar';

const TAB_META: Record<string, { icon: React.ReactNode; color: string; desc: string }> = {
  search: { icon: <Search size={64} />,   color: '#3b82f6', desc: 'Search for movies, shows, and people' },
  shows:  { icon: <Tv size={64} />,      color: '#7c3aed', desc: 'Browse all TV Shows' },
  movies: { icon: <Film size={64} />,    color: '#dc2626', desc: 'Browse all Movies' },
  games:  { icon: <Gamepad2 size={64} />, color: '#16a34a', desc: 'Games — Beta' },
  myhash: { icon: <Bookmark size={64} />, color: '#d97706', desc: 'Your saved titles' },
};

interface PlaceholderPageProps {
  tab: TabId;
}

export function PlaceholderPage({ tab }: PlaceholderPageProps) {
  const meta = TAB_META[tab] ?? { icon: null, color: '#e50914', desc: 'Coming soon' };
  const label = tab === 'myhash' ? 'My HASH' : tab.charAt(0).toUpperCase() + tab.slice(1);

  return (
    <motion.div
      key={tab}
      className="flex flex-col items-center justify-center gap-6 text-center"
      style={{ minHeight: 'calc(100vh - 80px)', paddingTop: '80px' }}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        className="flex items-center justify-center rounded-full"
        style={{ width: 120, height: 120, background: `${meta.color}18`, color: meta.color }}
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 22, delay: 0.05 }}
      >
        {meta.icon}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1], delay: 0.1 }}
      >
        <h2 className="text-white text-3xl font-black mb-2">{label}</h2>
        <p className="text-zinc-400 text-base">{meta.desc}</p>
        <p className="text-zinc-600 text-sm mt-2">Coming soon — we're working on it.</p>
      </motion.div>
    </motion.div>
  );
}
