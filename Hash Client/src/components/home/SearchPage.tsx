import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocus } from '../../context/FocusContext';
import { getPosterUrl } from '../../utils/movieHelpers';

const API = 'http://localhost:5001/api';

// ─── Zone IDs ───────────────────────────────────────────
// Keep zones far from Home's zones to avoid conflicts.
// Left panel: SPACE(500), BACKSPACE(501), KBD rows 502–507, GENRES(508)
// Right panel: results rows 509–516 (up to 8 rows of 4, but we use 2 rows of 4)
const Z_SPACE     = 500;
const Z_BACKSPACE = 501;
const Z_KBD_BASE  = 502; // rows 502–507
const Z_GENRE     = 508;
const Z_RES_BASE  = 509; // result rows 509–510 (row 0 = 4 cards, row 1 = 4 cards)

const KBD_GRID = [
  ['a','b','c','d','e','f'],
  ['g','h','i','j','k','l'],
  ['m','n','o','p','q','r'],
  ['s','t','u','v','w','x'],
  ['y','z','1','2','3','4'],
  ['5','6','7','8','9','0'],
] as const;

const GENRES = ['Comedies', 'Action', 'Kids & Family', 'Horror', 'Documentaries', 'Anime'];

// ─── Navigation map: which zone/item to go to from a given zone ──────────
// Zones are organised spatially:
//   Col 0 (left panel):  Z_SPACE(0-1 items), Z_BACKSPACE(0-1), KBD rows, GENRE rows
//   Col 1 (right panel): Z_RES_BASE + row
//
// Up/Down within a column: handled by FocusContext's focusNavigate
// Left/Right between columns: cross-column jumps handled below

const COLS_LEFT  = [Z_SPACE, Z_BACKSPACE, ...KBD_GRID.map((_, i) => Z_KBD_BASE + i), Z_GENRE];
const COLS_RIGHT = [Z_RES_BASE, Z_RES_BASE + 1];

// Returns true if a zone belongs to the left panel
function isLeftZone(z: number) {
  return z === Z_SPACE || z === Z_BACKSPACE || (z >= Z_KBD_BASE && z <= Z_KBD_BASE + 5) || z === Z_GENRE;
}

interface SearchPageProps { onOpenDetails: (movie: any) => void; }

export function SearchPage({ onOpenDetails }: SearchPageProps) {
  const {
    zone, item,
    selectCount,
    setFocus,
    registerZone, unregisterZone,
    navigate: focusNavigate,
  } = useFocus();

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<any[]>([]);
  const [recoms, setRecoms]     = useState<any[]>([]);
  const [loading, setLoading]   = useState(false);
  const [hasQuery, setHasQuery] = useState(false);

  // Scrollable refs for the left panel (genres area) and right panel
  const leftPanelRef  = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);

  // ── Refs to track previous select / back counts ──────────
  const prevSel  = useRef(0);
  const dRef     = useRef<ReturnType<typeof setTimeout>>();

  // ── How many result rows are needed ──────────────────────
  const displayItems = hasQuery ? results : recoms;
  const row0Count = Math.min(4, displayItems.length);
  const row1Count = Math.max(0, Math.min(4, displayItems.length - 4));

  // ─── Register / unregister zones ─────────────────────────
  useEffect(() => {
    registerZone(Z_SPACE,     1);
    registerZone(Z_BACKSPACE, 1);
    KBD_GRID.forEach((row, i) => registerZone(Z_KBD_BASE + i, row.length));
    registerZone(Z_GENRE, GENRES.length);
    registerZone(Z_RES_BASE,     Math.max(1, row0Count));
    registerZone(Z_RES_BASE + 1, Math.max(1, row1Count));

    return () => {
      unregisterZone(Z_SPACE);
      unregisterZone(Z_BACKSPACE);
      KBD_GRID.forEach((_, i) => unregisterZone(Z_KBD_BASE + i));
      unregisterZone(Z_GENRE);
      unregisterZone(Z_RES_BASE);
      unregisterZone(Z_RES_BASE + 1);
    };
  }, [registerZone, unregisterZone, row0Count, row1Count]);

  // ─── Initial focus: first keyboard row ───────────────────
  useEffect(() => {
    setFocus(Z_KBD_BASE, 0, 'keyboard');
  }, [setFocus]);

  // ─── Fetch recommendations on mount ──────────────────────
  useEffect(() => {
    fetch(`${API}/movies/feed`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.feed) {
          // Pull up to 8 movies from the home feed as recommendations
          const all: any[] = [];
          Object.values(d.feed.home || {}).forEach((row: any) => {
            if (Array.isArray(row)) all.push(...row);
          });
          setRecoms(all.slice(0, 8));
        }
      })
      .catch(() => {});
  }, []);

  // ─── Search ───────────────────────────────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim()) {
      setHasQuery(false);
      setLoading(false);
      return;
    }
    setHasQuery(true);
    setLoading(true);
    try {
      const r = await fetch(`${API}/movies/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setResults(d.success && d.movies?.length ? d.movies.slice(0, 8) : []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(dRef.current);
    dRef.current = setTimeout(() => search(query), 250);
    return () => clearTimeout(dRef.current);
  }, [query, search]);

  // ─── Key handler ─────────────────────────────────────────
  const onKey = useCallback((key: string) => {
    if (key === '⌫') setQuery(p => p.slice(0, -1));
    else if (key === '⎵') setQuery(p => p + ' ');
    else setQuery(p => p + key);
  }, []);

  // ─── Select handler ──────────────────────────────────────
  useEffect(() => {
    if (selectCount <= prevSel.current) return;
    prevSel.current = selectCount;

    if (zone === Z_SPACE)     { onKey('⎵'); return; }
    if (zone === Z_BACKSPACE) { onKey('⌫'); return; }
    if (zone >= Z_KBD_BASE && zone <= Z_KBD_BASE + 5) {
      onKey(KBD_GRID[zone - Z_KBD_BASE][item]);
      return;
    }
    if (zone === Z_GENRE) {
      setQuery(GENRES[item]);
      return;
    }
    if (zone === Z_RES_BASE || zone === Z_RES_BASE + 1) {
      const idx = zone === Z_RES_BASE ? item : item + 4;
      const m = displayItems[idx];
      if (m) onOpenDetails(m);
    }
  }, [selectCount, zone, item, displayItems, onOpenDetails, onKey]);

  // ─── Cross-column navigation (Left/Right d-pad) ──────────
  // useFocus's navigate handles up/down within a zone column.
  // We intercept left/right keypresses here via a keydown listener to jump columns.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' && isLeftZone(zone)) {
        // Jump from left panel to right panel row 0
        const targetRow = row0Count > 0 ? Z_RES_BASE : Z_RES_BASE + 1;
        setFocus(targetRow, 0, 'keyboard');
        e.preventDefault();
      } else if (e.key === 'ArrowLeft' && !isLeftZone(zone)) {
        // Jump from right panel back to keyboard
        setFocus(Z_KBD_BASE, 0, 'keyboard');
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [zone, row0Count, setFocus]);

  // ─── Auto-scroll left panel when genre focused ───────────
  useEffect(() => {
    if (zone !== Z_GENRE || !leftPanelRef.current) return;
    const genreEls = leftPanelRef.current.querySelectorAll('[data-genre]');
    const el = genreEls[item] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [zone, item]);

  // ─── Auto-scroll right panel when result focused ─────────
  useEffect(() => {
    if ((zone !== Z_RES_BASE && zone !== Z_RES_BASE + 1) || !rightPanelRef.current) return;
    const idx = zone === Z_RES_BASE ? item : item + 4;
    const cards = rightPanelRef.current.querySelectorAll('[data-card]');
    const el = cards[idx] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [zone, item]);

  // ─── Helpers ─────────────────────────────────────────────
  const kbdActive   = (ri: number, ci: number) => zone === Z_KBD_BASE + ri && item === ci;
  const spaceActive = zone === Z_SPACE;
  const bsActive    = zone === Z_BACKSPACE;

  const posterOf = (m: any, idx: number) =>
    getPosterUrl(m) ?? `https://picsum.photos/seed/${m.id ?? idx}/200/300`;

  const titleOf = (m: any) => m.tmdb_title || m.title || 'Unknown';

  return (
    <div
      className="w-full h-full flex text-white overflow-hidden select-none"
      style={{ fontFamily: "'NetflixSans','Helvetica Neue',Helvetica,Arial,sans-serif", background: '#000' }}
    >
      {/* ══════════════ LEFT PANEL ══════════════ */}
      <div
        ref={leftPanelRef}
        className="shrink-0 flex flex-col overflow-y-auto overflow-x-hidden"
        style={{ width: 300, background: '#141414', scrollbarWidth: 'none' }}
      >
        {/* ── Query display ── */}
        <div className="px-5 pt-6 pb-3 shrink-0">
          <div
            className="w-full rounded px-3 py-2 text-white text-base font-medium min-h-[38px] flex items-center"
            style={{ background: '#1f1f1f', border: '1px solid #333', letterSpacing: '0.05em' }}
          >
            <AnimatePresence mode="popLayout">
              {query ? (
                <motion.span key="q" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  transition={{ duration: 0.1 }} className="flex-1 min-w-0 truncate">
                  {query}
                </motion.span>
              ) : (
                <motion.span key="ph" initial={{ opacity: 0 }} animate={{ opacity: 0.35 }} exit={{ opacity: 0 }}
                  className="text-sm flex-1">
                  Search titles…
                </motion.span>
              )}
            </AnimatePresence>
            {/* Blinking cursor */}
            <motion.span
              animate={{ opacity: [1, 1, 0, 0, 1] }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear', times: [0, 0.45, 0.5, 0.95, 1] }}
              className="ml-0.5 shrink-0 inline-block w-0.5 h-4 bg-white align-middle"
              style={{ marginTop: -1 }}
            />
          </div>
        </div>

        {/* ── Space + Backspace ── */}
        <div className="flex gap-1.5 px-5 pb-3 shrink-0">
          <motion.button
            onClick={() => { setFocus(Z_SPACE, 0, 'mouse'); onKey('⎵'); }}
            onMouseEnter={() => setFocus(Z_SPACE, 0, 'mouse')}
            whileTap={{ scale: 0.92 }}
            className="flex-1 h-11 flex items-center justify-center rounded transition-colors"
            style={{
              background: spaceActive ? '#3a3a3a' : '#242424',
              border: `2px solid ${spaceActive ? 'white' : 'transparent'}`,
            }}
            aria-label="Space"
          >
            <svg width="22" height="16" viewBox="0 0 22 16" fill="none">
              <rect x="1" y="7" width="20" height="7" rx="2" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none"/>
              <line x1="1" y1="7" x2="1" y2="1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="21" y1="7" x2="21" y2="1" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>

          <motion.button
            onClick={() => { setFocus(Z_BACKSPACE, 0, 'mouse'); onKey('⌫'); }}
            onMouseEnter={() => setFocus(Z_BACKSPACE, 0, 'mouse')}
            whileTap={{ scale: 0.92 }}
            className="flex-1 h-11 flex items-center justify-center rounded transition-colors"
            style={{
              background: bsActive ? '#3a3a3a' : '#242424',
              border: `2px solid ${bsActive ? 'white' : 'transparent'}`,
            }}
            aria-label="Backspace"
          >
            <svg width="26" height="18" viewBox="0 0 26 18" fill="none">
              <path d="M10 1H24C25.1 1 26 1.9 26 3V15C26 16.1 25.1 17 24 17H10L1 9L10 1Z"
                stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
              <line x1="14" y1="6" x2="22" y2="12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
              <line x1="22" y1="6" x2="14" y2="12" stroke="rgba(255,255,255,0.7)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </motion.button>
        </div>

        {/* ── Keyboard grid ── */}
        <div className="px-5 pb-4 shrink-0">
          {KBD_GRID.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1">
              {row.map((ch, ci) => {
                const active = kbdActive(ri, ci);
                return (
                  <motion.button
                    key={ch}
                    onClick={() => { setFocus(Z_KBD_BASE + ri, ci, 'mouse'); onKey(ch); }}
                    onMouseEnter={() => setFocus(Z_KBD_BASE + ri, ci, 'mouse')}
                    whileTap={{ scale: 0.88 }}
                    animate={{ scale: active ? 1.08 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    className="flex items-center justify-center rounded text-sm font-medium transition-colors"
                    style={{
                      width: 44, height: 44,
                      background: active ? '#3a3a3a' : '#242424',
                      border: `2px solid ${active ? 'white' : 'transparent'}`,
                      color: active ? '#fff' : 'rgba(255,255,255,0.75)',
                      zIndex: active ? 10 : undefined,
                    }}
                  >
                    {ch}
                  </motion.button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Genre list (scrollable continuation of left panel) ── */}
        <div className="pb-8">
          {GENRES.map((g, i) => {
            const active = zone === Z_GENRE && item === i;
            return (
              <motion.button
                key={g}
                data-genre={i}
                onClick={() => { setFocus(Z_GENRE, i, 'mouse'); setQuery(g); }}
                onMouseEnter={() => setFocus(Z_GENRE, i, 'mouse')}
                className="w-full text-left py-2.5 px-5 font-medium transition-colors"
                animate={{ color: active ? '#ffffff' : '#888888', x: active ? 6 : 0 }}
                transition={{ duration: 0.15 }}
                style={{ fontSize: 17 }}
              >
                {g}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* ══════════════ RIGHT PANEL ══════════════ */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: '#000' }}>
        {/* ── Section title ── */}
        <div className="shrink-0 px-8 pt-7 pb-5">
          <motion.h1
            key={hasQuery ? 'results' : 'recoms'}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="text-white font-bold"
            style={{ fontSize: 28, letterSpacing: '-0.01em' }}
          >
            {hasQuery ? 'Search Results' : 'Your Search Recommendations'}
          </motion.h1>
        </div>

        {/* ── Movie grid (scrollable) ── */}
        <div
          ref={rightPanelRef}
          className="flex-1 overflow-y-auto px-8 pb-12"
          style={{ scrollbarWidth: 'none' }}
        >
          {/* Loading spinner */}
          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex justify-center py-24">
                <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* No results */}
          {!loading && hasQuery && results.length === 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-24 text-zinc-500">
              <p className="text-2xl font-semibold">No results found</p>
              <p className="text-sm mt-2 text-zinc-600">Try a different title or keyword</p>
            </motion.div>
          )}

          {/* Grid */}
          {!loading && displayItems.length > 0 && (
            <motion.div
              className="grid grid-cols-4 gap-3"
              initial="hidden"
              animate="visible"
              variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.04 } } }}
            >
              {displayItems.map((m, idx) => {
                const rowIdx = idx < 4 ? 0 : 1;
                const colIdx = idx < 4 ? idx : idx - 4;
                const z = Z_RES_BASE + rowIdx;
                const active = zone === z && item === colIdx;

                const title = titleOf(m);
                const poster = posterOf(m, idx);

                return (
                  <motion.button
                    key={m._id ?? m.id ?? idx}
                    data-card={idx}
                    onClick={() => { setFocus(z, colIdx, 'mouse'); onOpenDetails(m); }}
                    onMouseEnter={() => setFocus(z, colIdx, 'mouse')}
                    className="relative rounded overflow-hidden text-left cursor-pointer"
                    style={{ aspectRatio: '2/3', display: 'block' }}
                    variants={{ hidden: { opacity: 0, scale: 0.96 }, visible: { opacity: 1, scale: 1 } }}
                    animate={{ scale: active ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                  >
                    {/* Poster image */}
                    <img
                      src={poster}
                      alt={title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />

                    {/* N logo */}
                    <span
                      className="absolute top-2 left-2 font-black leading-none drop-shadow-lg"
                      style={{ color: '#e50914', fontSize: 22 }}
                    >
                      N
                    </span>

                    {/* TOP 10 badge */}
                    {m.top10 && (
                      <div
                        className="absolute top-2 right-2 flex flex-col items-center justify-center leading-tight drop-shadow-md"
                        style={{
                          background: '#e50914', color: '#fff',
                          fontSize: 10, fontWeight: 800,
                          padding: '3px 5px', borderRadius: 3,
                          lineHeight: 1.15, letterSpacing: '0.02em',
                          minWidth: 26, textAlign: 'center',
                        }}
                      >
                        <span>TOP</span>
                        <span>10</span>
                      </div>
                    )}

                    {/* Bottom gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent pointer-events-none" />

                    {/* Banners */}
                    {m.twoLine ? (
                      <div className="absolute bottom-0 left-0 right-0">
                        <div className="text-white font-bold py-1 text-center"
                          style={{ background: '#e50914', fontSize: 13 }}>New Episode</div>
                        <div className="text-black font-bold py-1 text-center"
                          style={{ background: '#fff', fontSize: 13 }}>Watch Now</div>
                      </div>
                    ) : m.banner ? (
                      <div className="absolute bottom-0 left-0 right-0 text-white font-bold py-1.5 text-center"
                        style={{ background: '#e50914', fontSize: 13 }}>
                        {m.banner}
                      </div>
                    ) : (
                      <div className="absolute bottom-0 left-0 right-0 p-2.5 pointer-events-none">
                        <h3 className="text-white font-bold leading-tight drop-shadow-lg"
                          style={{ fontSize: 13 }}>
                          {title}
                        </h3>
                      </div>
                    )}

                    {/* Focus ring */}
                    <AnimatePresence>
                      {active && (
                        <motion.div
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                          transition={{ duration: 0.1 }}
                          className="absolute inset-0 rounded pointer-events-none"
                          style={{ boxShadow: 'inset 0 0 0 3px white' }}
                        />
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}