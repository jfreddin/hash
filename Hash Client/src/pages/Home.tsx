import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import { FocusProvider, useFocus } from '../context/FocusContext';
import { MuteProvider, useMute } from '../context/MuteContext';
import { useGamepad } from '../hooks/useGamepad';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

import { HomeNavbar } from '../components/home/HomeNavbar';
import type { TabId } from '../components/home/HomeNavbar';
import { HeroSection } from '../components/home/HeroSection';
import { MovieRow, CARD_W, CARD_H, ROW_H, EXPANDED_W } from '../components/home/MovieRow';
import { PlaceholderPage } from '../components/home/PlaceholderPage';
import { MovieDetail } from '../components/home/MovieDetail';
import { getBackdropUrl, getTrailerKey, getTrailerEmbedUrl } from '../utils/movieHelpers';

const API = 'http://localhost:5001/api';

// ── Layout constants — fixed, never computed from DOM ─────────────────────
const NAVBAR_H = 80;    // px — height of the fixed navbar
const HERO_H = 520;     // px — hero section height (rounded card)
const HERO_CARD_TOP_OFFSET = 12;
const HERO_CARD_WIDTH = '94%';
const HERO_ROW_GAP = 18; // gap between hero and first movie row
const ROW_GAP = 24;     // gap between rows

// Pre-calculated zone → translateY offset (pure math, no DOM reads)
// Zone 0 (Navbar): no offset needed, navbar is fixed
// Zone 1 (Hero): content at y=0
// Zone 2+ (rows): shift content up so row starts at NAVBAR_H - 12
function calcTranslateY(zone: number): number {
  if (zone <= 1) return 0;
  const rowIndex = zone - 2; // 0-based row index
  const heroOffset = HERO_H + HERO_ROW_GAP; // hero plus gap before rows
  const rowsOffset = rowIndex * (ROW_H + ROW_GAP); // rows before this one
  const target = NAVBAR_H - 12; // where we want the active row top to be
  return -(heroOffset + rowsOffset - target);
}

// ─────────────────────────────────────────────────────────
interface GlobalTrailerPlayerProps {
  movie: any;
  isHero: boolean;
  isFullScreen: boolean;
  muted: boolean;
  onEnded: () => void;
  visible: boolean;
}

function GlobalTrailerPlayer({
  movie,
  isHero,
  isFullScreen,
  muted,
  onEnded,
  visible,
}: GlobalTrailerPlayerProps) {
  const trailerKey = movie ? getTrailerKey(movie) : null;
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!visible || !trailerKey) return;
    const onMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      try {
        const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        const state = (data?.info as any)?.playerState ?? data?.info;
        if (state === 0) {
          onEnded();
        }
      } catch { /* ignore */ }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [visible, trailerKey, onEnded]);

  if (!visible || !trailerKey) return null;

  // Compute dimensions relative to root viewport (since player is rendered at root level)
  const dims = isFullScreen
    ? { left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 35 }
    : isHero
    ? { left: '3%', top: NAVBAR_H + HERO_CARD_TOP_OFFSET, width: HERO_CARD_WIDTH, height: HERO_H - HERO_CARD_TOP_OFFSET, zIndex: 2 }
    : { left: 60, top: NAVBAR_H + 108, width: EXPANDED_W - 8, height: CARD_H - 8, zIndex: 2 };
  const radius = isFullScreen ? 0 : isHero ? 16 : 4;
  const iframeCrop = isFullScreen
    ? { left: 0, top: 0, width: '100%', height: '100%' }
    : isHero
    ? { left: '-30%', top: '-30%', width: '160%', height: '160%' }
    : { left: '-18%', top: '-18%', width: '136%', height: '136%' };

  return (
    <motion.div
      className="absolute overflow-hidden pointer-events-none"
      initial={dims}
      animate={{
        left: dims.left,
        top: dims.top,
        width: dims.width,
        height: dims.height,
        borderRadius: radius,
      }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1.1 }}
      style={{
        zIndex: dims.zIndex,
        willChange: 'left, top, width, height',
        backgroundColor: '#000',
        transform: 'translateZ(0)',
        isolation: 'isolate',
        contain: 'paint',
        clipPath: `inset(0 round ${radius}px)`,
        WebkitMaskImage: '-webkit-radial-gradient(white, black)',
      }}
    >
      <iframe
        ref={iframeRef}
        key={`global-trailer-${trailerKey}-${muted}`}
        src={getTrailerEmbedUrl(trailerKey, muted)}
        className="absolute"
        style={{
          ...iframeCrop,
          border: 'none',
          pointerEvents: 'none',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        referrerPolicy="strict-origin-when-cross-origin"
        title="trailer"
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
// Inner component — lives inside FocusProvider
// ─────────────────────────────────────────────────────────
function HomeContent({ user, onLogout }: { user: any; onLogout: () => void }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [glowVisible, setGlowVisible] = useState(false);
  const { zone, item, selectCount, backCount, navigate: focusNavigate, setFocus } = useFocus();
  const { muted } = useMute();

  const [activeDetailMovie, setActiveDetailMovie] = useState<any | null>(null);
  const [trailerMovie, setTrailerMovie] = useState<any | null>(null);
  const [trailerIsHero, setTrailerIsHero] = useState<boolean>(false);
  const [trailerVisible, setTrailerVisible] = useState<boolean>(false);
  const trailerStateRef = useRef({ movieId: null as string | null, isHero: false, visible: false });

  const lastFocusBeforeDetails = useRef<{ zone: number; item: number } | null>(null);

  useEffect(() => {
    trailerStateRef.current = {
      movieId: trailerMovie?._id ?? null,
      isHero: trailerIsHero,
      visible: trailerVisible,
    };
  }, [trailerMovie, trailerIsHero, trailerVisible]);

  const onStartTrailer = useCallback((movie: any, isHero: boolean) => {
    const current = trailerStateRef.current;
    if (current.visible && current.movieId === movie?._id && current.isHero === isHero) {
      return;
    }

    setTrailerMovie(movie);
    setTrailerIsHero(isHero);
    setTrailerVisible(true);
  }, []);

  const onStopTrailer = useCallback((movie: any) => {
    setTrailerMovie((prev: any) => (prev?._id === movie?._id ? null : prev));
  }, []);

  // Sync trailer visibility with active movie selection to avoid jitter/unmounts on blur
  useEffect(() => {
    if (!trailerMovie) {
      setTrailerVisible(false);
    }
  }, [trailerMovie]);

  const onOpenDetails = useCallback((movie: any) => {
    lastFocusBeforeDetails.current = { zone, item };
    setActiveDetailMovie(movie);
  }, [zone, item]);

  const onCloseDetails = useCallback(() => {
    setActiveDetailMovie(null);
    if (lastFocusBeforeDetails.current) {
      const { zone: z, item: i } = lastFocusBeforeDetails.current;
      setFocus(z, i, 'keyboard');
    }
  }, [setFocus]);

  // Viewport ref for zone-level scroll navigation (wheel outside active row)
  const viewportRef = useRef<HTMLDivElement>(null);
  const viewportWheelDebounce = useRef(0);


  useGamepad(activeTab);
  useKeyboardNav(activeTab);

  // Wheel outside active movie row → navigate zones up/down
  // The active MovieRow calls stopPropagation so this only fires in non-row areas
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const now = Date.now();
      if (now - viewportWheelDebounce.current < 220) return;
      viewportWheelDebounce.current = now;
      if (e.deltaY > 0) focusNavigate(1, 0);  // scroll down → next zone
      else if (e.deltaY < 0) focusNavigate(-1, 0); // scroll up → prev zone
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [focusNavigate]);

  // Navbar scrolled state (for background opacity) — zone > 1 means rows visible
  const scrolled = zone > 1;

  // ── Movie data ──
  const [feed, setFeed] = useState<any | null>(null);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const opts: RequestInit = { credentials: 'include' };
    Promise.all([
      fetch(`${API}/movies/feed`, opts).then((r) => r.json()),
      fetch(`${API}/movies/mylist`, opts).then((r) => r.json()),
    ])
      .then(([fd, ml]) => {
        if (fd.success) setFeed(fd.feed);
        if (ml.success) setMyList(ml.movies ?? []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Logout ──
  const handleLogout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    onLogout();
    navigate('/login');
  };

  // ── Navbar selection via keyboard / gamepad (zone 0) ──
  const tabs: TabId[] = ['search', 'home', 'shows', 'movies', 'games', 'myhash'];
  const prevSelect = useRef(0);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (zone === 0) {
      if (item === 6) handleLogout();
      else { const tab = tabs[item]; if (tab) setActiveTab(tab); }
    }
  }, [selectCount, zone, item]);

  // ── Back action ──
  const prevBack = useRef(0);
  useEffect(() => {
    if (backCount <= prevBack.current) return;
    prevBack.current = backCount;
    if (activeDetailMovie) {
      onCloseDetails();
    } else if (activeTab !== 'home') {
      setActiveTab('home');
    }
  }, [backCount, activeTab, activeDetailMovie, onCloseDetails]);

  // Reset focus to Hero (Zone 1) when switching tabs if we are currently in rows
  const zoneRef = useRef(zone);
  zoneRef.current = zone;
  useEffect(() => {
    if (zoneRef.current > 1) {
      setFocus(1, 0, 'keyboard');
    }
  }, [activeTab, setFocus]);

  // Get rows for the active tab
  const getActiveTabRows = useCallback((): [string, any[]][] => {
    if (!feed) return [];
    let rows: [string, any[]][] = [];
    if (activeTab === 'home') rows = Object.entries(feed.home || {});
    else if (activeTab === 'movies') rows = Object.entries(feed.movies || {});
    else if (activeTab === 'shows') rows = Object.entries(feed.shows || {});
    
    // Append My List row to the Home page if it has items
    if (activeTab === 'home' && myList.length > 0) {
      rows.push(['My List', myList]);
    }
    return rows;
  }, [feed, activeTab, myList]);

  const getHeroMovie = useCallback(() => {
    if (!feed) return null;
    if (activeTab === 'home') return feed.heroHome;
    if (activeTab === 'movies') return feed.heroMovies;
    if (activeTab === 'shows') return feed.heroShows;
    return null;
  }, [feed, activeTab]);

  const hero = getHeroMovie();

  // Get currently focused movie based on zone and item
  const getFocusedMovie = () => {
    if (zone <= 1) return hero;
    const rows = getActiveTabRows();
    const rowIndex = zone - 2;
    if (rowIndex >= 0 && rowIndex < rows.length) {
      const [_, movies] = rows[rowIndex];
      return movies[item] ?? null;
    }
    return null;
  };
  const currentFocusedMovie = getFocusedMovie();

  // Delay the ambient glow animation for premium visual reveal
  useEffect(() => {
    setGlowVisible(false);
    if (!currentFocusedMovie) return;

    const t = setTimeout(() => {
      setGlowVisible(true);
    }, 1800);
    return () => clearTimeout(t);
  }, [zone, item, currentFocusedMovie]);

  // Pure math — no DOM reads, never changes due to card expansion
  const translateY = calcTranslateY(zone);

  return (
    <div
      className="w-screen h-screen overflow-hidden text-white relative"
      style={{ fontFamily: "'NetflixSans','Helvetica Neue',Helvetica,Arial,sans-serif", background: '#000' }}
    >
      {/* ── Ambient glow — fixed full-screen layer, behind navbar AND content ── */}
      {/* Visible on zone 0 (navbar) and zone 1 (hero), fades when rows are active */}
      {(() => {
        const glowUrl = currentFocusedMovie ? getBackdropUrl(currentFocusedMovie) : null;
        return glowUrl ? (
          <motion.div
            className="fixed inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
            animate={{ opacity: glowVisible ? 1 : 0 }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
          >
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: `url(${glowUrl}) center/cover no-repeat`,
                filter: 'blur(60px) saturate(1.5) brightness(0.35)',
              }}
            />
          </motion.div>
        ) : null;
      })()}

      {/* ── Fixed Navbar — always on top (z-50 = z-index 50, above glow z=1) ── */}
      <AnimatePresence>
        {!activeDetailMovie && (
          <motion.div
            initial={{ y: -NAVBAR_H, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -NAVBAR_H, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            style={{ zIndex: 50, position: 'relative' }}
          >
            <HomeNavbar
              activeTab={activeTab}
              onTabChange={setActiveTab}
              user={user}
              onLogout={handleLogout}
              scrolled={scrolled}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared Page-Level Trailer Player (rendered at root level to prevent clipping and enable full screen) */}
      <GlobalTrailerPlayer
        movie={trailerMovie}
        isHero={trailerIsHero}
        isFullScreen={!!activeDetailMovie}
        muted={muted}
        onEnded={() => setTrailerVisible(false)}
        visible={trailerVisible}
      />

      {/* ── Viewport — everything below navbar ── */}
      <div
        ref={viewportRef}
        className="absolute inset-0 overflow-hidden"
        style={{ top: NAVBAR_H, zIndex: 10 }}
      >

        <AnimatePresence mode="wait">
          {['home', 'movies', 'shows'].includes(activeTab) ? (
            <motion.div
              key={`${activeTab}-content`}
              initial={{ opacity: 0 }}
              animate={{
                opacity: activeDetailMovie ? 0 : 1,
                y: translateY,
                pointerEvents: activeDetailMovie ? 'none' : 'auto'
              }}
              exit={{ opacity: 0 }}
              transition={{
                opacity: { duration: 0.2 },
                y: { type: 'spring', stiffness: 230, damping: 28, mass: 0.7 },
              }}
              // absolute width to prevent layout reflow
              className="absolute top-0 left-0 right-0"
              style={{ zIndex: 10 }}
            >
              {/* ── Hero ── */}
              <motion.div
                animate={{ opacity: zone > 1 ? 0 : 1 }}
                transition={{ duration: 0.35 }}
                style={{ pointerEvents: zone > 1 ? 'none' : 'auto', height: HERO_H }}
              >
                {loading ? (
                  <div className="mx-4 mt-3 rounded-2xl animate-pulse bg-zinc-800" style={{ height: HERO_H - 12 }} />
                ) : hero ? (
                  <HeroSection
                    movie={hero}
                    onOpenDetails={onOpenDetails}
                    onStartTrailer={onStartTrailer}
                    onStopTrailer={onStopTrailer}
                    trailerPlaying={trailerMovie?._id === hero._id && trailerVisible && trailerIsHero}
                    activeDetailMovieId={activeDetailMovie?._id}
                  />
                ) : null}
              </motion.div>

              {/* ── Movie rows — fixed gap, no dynamic heights ── */}
              <div className="flex flex-col" style={{ gap: ROW_GAP, marginTop: HERO_ROW_GAP }}>
                {loading ? (
                  [0, 1, 2].map((i) => (
                    <div key={i} className="px-14">
                      <div className="h-5 w-40 bg-zinc-800 rounded mb-3 animate-pulse" />
                      <div className="flex gap-4">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <div key={j} className="shrink-0 bg-zinc-800 rounded animate-pulse"
                            style={{ width: CARD_W, height: CARD_H }} />
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <>
                    {getActiveTabRows().map(([title, movies], index) => (
                      <MovieRow
                        key={title}
                        title={title}
                        movies={movies}
                        zone={index + 2}
                        onOpenDetails={onOpenDetails}
                        onStartTrailer={onStartTrailer}
                        onStopTrailer={onStopTrailer}
                        trailerMovie={trailerMovie}
                        trailerVisible={trailerVisible}
                        trailerIsHero={trailerIsHero}
                        activeDetailMovieId={activeDetailMovie?._id}
                      />
                    ))}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            <PlaceholderPage key={activeTab} tab={activeTab} />
          )}
        </AnimatePresence>

      </div>

      {/* Details View Overlay */}
      <AnimatePresence>
        {activeDetailMovie && (
          <MovieDetail
            movie={activeDetailMovie}
            onBack={onCloseDetails}
            trailerPlaying={trailerMovie?._id === activeDetailMovie._id && trailerVisible}
          />
        )}
      </AnimatePresence>

      {/* ── Controller hints overlay ── */}
      <ControllerHints />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
function ControllerHints() {
  const { inputMode } = useFocus();
  return (
    <AnimatePresence>
      {inputMode === 'gamepad' && (
        <motion.div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-5 px-5 py-2.5 rounded-full text-xs text-white/70 z-50"
          style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)' }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.25 }}
        >
          <span><span className="text-white font-semibold">✕ / A</span> Select</span>
          <span><span className="text-white font-semibold">○ / B</span> Back</span>
          <span><span className="text-white font-semibold">D-Pad / Stick</span> Navigate</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────
interface HomeProps {
  user: any;
  onLogout: () => void;
}

export function Home({ user, onLogout }: HomeProps) {
  return (
    <MuteProvider>
      <FocusProvider>
        <HomeContent user={user} onLogout={onLogout} />
      </FocusProvider>
    </MuteProvider>
  );
}
