import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useFocus } from '../../context/FocusContext';

const API = 'http://localhost:5001/api';

// ─── Mock data for initial recommendations ───
const MOCK_RESULTS = [
  { id: 1, title: 'Ginny & Georgia', type: 'show', banner: 'New Season', top10: true, img: 101 },
  { id: 2, title: 'Straw (Tyler Perry\'s)', type: 'movie', banner: 'Recently Added', top10: true, img: 102 },
  { id: 3, title: 'Cocaine Air:\nSmugglers at 30,000ft', type: 'movie', banner: 'Recently Added', top10: true, img: 103 },
  { id: 4, title: 'Tout Pour La Lumière', type: 'movie', top10: true, twoLine: true, img: 104 },
  { id: 5, title: 'Brooklyn Nine-Nine', type: 'show', top10: false, img: 105 },
  { id: 6, title: 'Stranger Things', type: 'show', top10: false, img: 106 },
  { id: 7, title: 'Nonnas', type: 'movie', top10: false, img: 107 },
  { id: 8, title: 'Shafted', type: 'movie', top10: false, img: 108 },
];

const GENRES = ['Comedies', 'Action', 'Kids & Family', 'Horror', 'Documentaries', 'Anime'];

// ─── Zone layout ──────────────────────────────
// 300-306: keyboard rows (7 rows)
// 307:     genres (6 items)
// 308:     results row 1 (4 items)
// 309:     results row 2 (4 items)
const Z_SPECIAL  = 300;
const Z_KBD_ROW1 = 301;
const Z_KBD_ROW2 = 302;
const Z_KBD_ROW3 = 303;
const Z_KBD_ROW4 = 304;
const Z_KBD_ROW5 = 305;
const Z_KBD_ROW6 = 306;
const Z_GENRE    = 307;
const Z_RESULT_1 = 308;
const Z_RESULT_2 = 309;

const KBD_GRID = [
  ['a','b','c','d','e','f'],
  ['g','h','i','j','k','l'],
  ['m','n','o','p','q','r'],
  ['s','t','u','v','w','x'],
  ['y','z','1','2','3','4'],
  ['5','6','7','8','9','0'],
];

interface SearchPageProps { onOpenDetails: (movie: any) => void; }

export function SearchPage({ onOpenDetails }: SearchPageProps) {
  const { zone, item, selectCount, backCount, setFocus, registerZone, unregisterZone } = useFocus();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>(MOCK_RESULTS);
  const [loading, setLoading] = useState(false);
  const [usable, setUsable] = useState(false);  // true once user has typed

  const prevSel = useRef(selectCount);
  const dRef = useRef<NodeJS.Timeout>();
  const rRef = useRef<HTMLDivElement>(null);

  // ─── Register zones ──────────────────────────
  useEffect(() => {
    registerZone(Z_SPECIAL, 2);
    KBD_GRID.forEach((_, i) => registerZone(Z_KBD_ROW1 + i, 6));
    registerZone(Z_GENRE, GENRES.length);
    registerZone(Z_RESULT_1, Math.min(4, results.length));
    registerZone(Z_RESULT_2, Math.max(0, Math.min(4, results.length - 4)));
    return () => {
      unregisterZone(Z_SPECIAL);
      KBD_GRID.forEach((_, i) => unregisterZone(Z_KBD_ROW1 + i));
      unregisterZone(Z_GENRE);
      unregisterZone(Z_RESULT_1);
      unregisterZone(Z_RESULT_2);
    };
  }, [registerZone, unregisterZone, results.length]);

  useEffect(() => { setFocus(Z_KBD_ROW1, 0, 'keyboard'); }, [setFocus]);

  // ─── Search via backend ──────────────────────
  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults(MOCK_RESULTS); setUsable(false); return; }
    setLoading(true); setUsable(true);
    try {
      const r = await fetch(`${API}/movies/search?q=${encodeURIComponent(q)}`, { credentials: 'include' });
      const d = await r.json();
      setResults(d.success && d.movies.length ? d.movies.slice(0, 8) : []);
    } catch { setResults([]); } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    clearTimeout(dRef.current);
    dRef.current = setTimeout(() => search(query), 200);
    return () => clearTimeout(dRef.current);
  }, [query, search]);

  const onKey = useCallback((key: string) => {
    if (key === '⌫') setQuery(p => p.slice(0, -1));
    else if (key === '⎵') setQuery(p => p + ' ');
    else setQuery(p => p + key);
  }, []);

  // ─── Select handler ─────────────────────────
  useEffect(() => {
    if (selectCount <= prevSel.current) return;
    prevSel.current = selectCount;
    if (zone >= Z_RESULT_1 && zone <= Z_RESULT_2 && item < results.length) {
      const idx = zone === Z_RESULT_1 ? item : item + 4;
      const m = results[idx];
      if (m) onOpenDetails(m);
    }
  }, [selectCount, zone, item, results, onOpenDetails]);

  // Auto-scroll results into view
  useEffect(() => {
    if (zone !== Z_RESULT_1 && zone !== Z_RESULT_2) return;
    const idx = zone === Z_RESULT_1 ? item : item + 4;
    const el = rRef.current?.children[idx] as HTMLElement | undefined;
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [zone, item]);

  // ─── Render helpers ──────────────────────────
  const zRow = (gi: number) => Z_KBD_ROW1 + gi;

  const kbdActive = (ri: number, ci: number) => zone === zRow(ri) && item === ci;

  return (
    <div className="w-full h-full flex bg-[#141414] text-white overflow-hidden select-none" style={{ fontFamily: "'Helvetica Neue',Arial,sans-serif" }}>
      {/* ─── LEFT COLUMN (280px) ──────────────── */}
      <div className="w-[280px] shrink-0 bg-[#1a1a1a] flex flex-col overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {/* ── Spacebar + Backspace row ── */}
        <div className="flex gap-1 px-4 pt-5 pb-1">
          <button
            onClick={() => onKey('⎵')}
            onMouseEnter={() => setFocus(Z_SPECIAL, 0, 'mouse')}
            className={`
              flex-1 h-10 flex items-center justify-center rounded text-white/70 font-medium text-sm transition-all
              ${zone === Z_SPECIAL && item === 0
                ? 'bg-[#3a3a3a] border-2 border-white scale-105'
                : 'bg-[#333] hover:bg-[#3a3a3a]'}
            `}
          >
            <span className="underline decoration-2 underline-offset-4">⎵</span>
          </button>
          <button
            onClick={() => onKey('⌫')}
            onMouseEnter={() => setFocus(Z_SPECIAL, 1, 'mouse')}
            className={`
              flex-1 h-10 flex items-center justify-center rounded text-white/70 text-lg transition-all
              ${zone === Z_SPECIAL && item === 1
                ? 'bg-[#3a3a3a] border-2 border-white scale-105'
                : 'bg-[#333] hover:bg-[#3a3a3a]'}
            `}
          >
            ⌫
          </button>
        </div>

        {/* ── Keyboard character grid ── */}
        <div className="px-4 pb-3">
          {KBD_GRID.map((row, ri) => (
            <div key={ri} className="flex gap-1 mb-1">
              {row.map((ch, ci) => {
                const active = kbdActive(ri, ci);
                return (
                  <button
                    key={ch}
                    onClick={() => { setFocus(zRow(ri), ci, 'mouse'); onKey(ch); }}
                    onMouseEnter={() => setFocus(zRow(ri), ci, 'mouse')}
                    className={`
                      w-10 h-10 flex items-center justify-center rounded text-sm font-medium transition-all
                      ${active
                        ? 'bg-[#3a3a3a] border-2 border-white scale-105 z-10'
                        : 'bg-[#2a2a2a] text-white hover:bg-[#3a3a3a]'}
                    `}
                  >
                    {ch}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* ── Genre list ── */}
        <div className="border-t border-white/5 mt-1 pt-3 pb-6">
          {GENRES.map((g, i) => {
            const active = zone === Z_GENRE && item === i;
            return (
              <button
                key={g}
                onClick={() => { setFocus(Z_GENRE, i, 'mouse'); setQuery(g.toLowerCase()); }}
                onMouseEnter={() => setFocus(Z_GENRE, i, 'mouse')}
                className={`
                  w-full text-left py-2 px-4 text-lg font-medium transition-all
                  ${active ? 'text-white' : 'text-[#aaa] hover:text-white'}
                `}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RIGHT COLUMN ──────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="shrink-0 px-8 pt-7 pb-4">
          <h1 className="text-white text-3xl font-bold">
            {usable ? `Search Results` : `Your Search Recommendations`}
          </h1>
        </div>

        <div ref={rRef} className="flex-1 overflow-y-auto px-8 pb-12" style={{ scrollbarWidth: 'none' }}>
          {loading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {!loading && usable && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <p className="text-2xl font-medium">No results found</p>
              <p className="text-base mt-2 text-zinc-600">Try different keywords</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              {results.map((m, idx) => {
                const rowIdx = idx < 4 ? 0 : 1;
                const colIdx = idx < 4 ? idx : idx - 4;
                const z = rowIdx === 0 ? Z_RESULT_1 : Z_RESULT_2;
                const active = zone === z && item === colIdx;

                const title = m.tmdb_title || m.title || 'Unknown';
                const imgIdx = m.img || ((m.id || idx) % 108 + 100);
                const posterUrl = m.images?.posters?.[0]?.file_path
                  ? `https://image.tmdb.org/t/p/w342${m.images.posters[0].file_path}`
                  : `https://picsum.photos/seed/${imgIdx}/200/300`;

                return (
                  <motion.button
                    key={m._id ?? m.id ?? idx}
                    onClick={() => { setFocus(z, colIdx, 'mouse'); onOpenDetails(m); }}
                    onMouseEnter={() => setFocus(z, colIdx, 'mouse')}
                    className="relative rounded-md overflow-hidden cursor-pointer text-left"
                    animate={{ scale: active ? 1.05 : 1 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 26 }}
                    style={{ aspectRatio: '2/3' }}
                  >
                    {/* Poster */}
                    <img src={posterUrl} alt={title} className="absolute inset-0 w-full h-full object-cover" loading="lazy" draggable={false} />

                    {/* N logo top-left */}
                    <span className="absolute top-2 left-2 text-red-600 font-black text-xl leading-none drop-shadow-lg">N</span>

                    {/* TOP 10 badge */}
                    {m.top10 && (
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold leading-tight px-1.5 py-1 rounded-sm text-center drop-shadow-md">
                        <div>TOP</div>
                        <div>10</div>
                      </div>
                    )}

                    {/* Gradient overlay at bottom for text */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent pointer-events-none" />

                    {/* Status banners */}
                    {m.twoLine ? (
                      <div className="absolute bottom-0 left-0 right-0">
                        <div className="bg-red-600 text-white text-sm font-bold py-1 text-center">New Episode</div>
                        <div className="bg-white text-black text-sm font-bold py-1 text-center">Watch Now</div>
                      </div>
                    ) : m.banner ? (
                      <div className="absolute bottom-0 left-0 right-0 bg-red-600 text-white text-sm font-bold py-1.5 text-center">
                        {m.banner}
                      </div>
                    ) : null}

                    {/* Title overlay (only if no banner — banner covers it) */}
                    {!m.banner && !m.twoLine && (
                      <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none">
                        <h3 className="text-white font-bold text-sm leading-tight drop-shadow-lg">{title}</h3>
                      </div>
                    )}

                    {/* Focus ring */}
                    {active && (
                      <div className="absolute inset-0 rounded-md pointer-events-none" style={{ boxShadow: 'inset 0 0 0 2.5px white' }} />
                    )}
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
