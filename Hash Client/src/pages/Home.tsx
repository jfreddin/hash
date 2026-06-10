import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, VolumeX } from 'lucide-react';

import { FocusProvider, useFocus } from '../context/FocusContext';
import { MuteProvider, useMute } from '../context/MuteContext';
import { useGamepad } from '../hooks/useGamepad';
import { useKeyboardNav } from '../hooks/useKeyboardNav';

import { HomeNavbar } from '../components/home/HomeNavbar';
import type { TabId } from '../components/home/HomeNavbar';
import { HeroSection } from '../components/home/HeroSection';
import { MovieRow, CARD_W, CARD_H, ROW_H, EXPANDED_W } from '../components/home/MovieRow';
import { PlaceholderPage } from '../components/home/PlaceholderPage';
import { SearchPage } from '../components/home/SearchPage';
import { MovieDetail } from '../components/home/MovieDetail';
import { getBackdropUrl, getTrailerKey, getTrailerEmbedUrl } from '../utils/movieHelpers';

const API = 'http://localhost:5001/api';

// ── Layout constants — fixed, never computed from DOM ─────────────────────
const NAVBAR_H = 100;    // px — height of the fixed navbar
const HERO_H = 600;     // px — hero section height (rounded card)
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
  const { volume } = useMute();

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

  // Global Audio Sync for Trailers
  useEffect(() => {
    if (!visible || !trailerKey || !iframeRef.current) return;

    const sync = () => {
      const effectiveVol = muted ? 0 : volume;
      const script = `
        (function sync(root) {
          Array.from(root.querySelectorAll("video, audio")).forEach(m => {
            m.volume = ${effectiveVol};
          });
          Array.from(root.querySelectorAll("iframe")).forEach(frame => {
            try {
              if (frame.contentDocument) sync(frame.contentDocument);
            } catch (e) {}
          });
        })(document);
      `;
      try {
         const win = window as any;
         if (win.require) {
            if (iframeRef.current && iframeRef.current.contentWindow) {
               (iframeRef.current.contentWindow as any).eval?.(script);
            }
         }
      } catch (e) {}
    };

    const interval = setInterval(sync, 1000);
    sync(); // Immediate attempt

    return () => clearInterval(interval);
  }, [volume, muted, visible, trailerKey]);

  if (!visible || !trailerKey) return null;

  // Compute dimensions relative to root viewport (since player is rendered at root level)
  const dims = isFullScreen
    ? { left: 0, top: 0, width: '100vw', height: '100vh', zIndex: 35 }
    : isHero
    ? { left: '3%', top: NAVBAR_H + HERO_CARD_TOP_OFFSET, width: HERO_CARD_WIDTH, height: HERO_H - HERO_CARD_TOP_OFFSET - 12, zIndex: 2 }
    : { left: 60, top: NAVBAR_H + 128, width: EXPANDED_W - 8, height: CARD_H - 8, zIndex: 2 };
  const radius = isFullScreen ? 0 : isHero ? 16 : 4;

  // Optimized Crop Logic: Fixed Height (100%), Automatic Aspect Width
  const iframeCrop = isFullScreen
    ? { left: 0, top: 0, width: '100%', height: '100%' }
    : isHero
    ? { 
        left: '50%', 
        top: '50%', 
        width: 'max(120vw, 1200px)', 
        height: 'max(67.5vw, 675px)',
        transform: 'translate(-50%, -50%)' 
      }
    : { 
        left: '50%', 
        top: '50%', 
        // 178% width at 100% height ensures the 16:9 trailer always covers the vertical card area
        width: '178%', 
        height: '100%', 
        transform: 'translate(-50%, -50%)' 
      };

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
        key={`global-trailer-${trailerKey}`}
        src={getTrailerEmbedUrl(trailerKey, true)} // Always start muted in URL, we handle unmuting via JS
        className="absolute pointer-events-none"
        style={{
          ...iframeCrop,
          border: 'none',
        }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen={false}
        referrerPolicy="strict-origin-when-cross-origin"
        title="trailer"
      />
      {/* Dark Vignette Overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 100px rgba(0,0,0,0.85), inset 0 0 60px rgba(0,0,0,0.6)',
          zIndex: 10,
        }}
      />
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────
const TABS: TabId[] = ['search', 'home', 'shows', 'movies', 'games', 'myhash'];

// Inner component — lives inside FocusProvider
// ─────────────────────────────────────────────────────────
function HomeContent({ user, onLogout }: { user: any; onLogout: () => void }) {
  const navigate = useNavigate();
  const { tmdbId: urlTmdbId } = useParams();

  const [activeTab, setActiveTab] = useState<TabId>('home');
  const [glowVisible, setGlowVisible] = useState(false);
  const { zone, item, selectCount, backCount, navigate: focusNavigate, setFocus } = useFocus();
  const { volume, showVolumeOverlay, muted } = useMute();

  const [activeDetailMovie, setActiveDetailMovie] = useState<any | null>(null);
  const [isEpisodesView, setIsEpisodesView] = useState<boolean>(false);
  const [trailerMovie, setTrailerMovie] = useState<any | null>(null);
  const [trailerIsHero, setTrailerIsHero] = useState<boolean>(false);
  const [trailerVisible, setTrailerVisible] = useState<boolean>(false);
  const trailerStateRef = useRef({ movieId: null as string | null, isHero: false, visible: false });

  const lastFocusBeforeDetails = useRef<{ zone: number; item: number } | null>(null);

  const [feed, setFeed] = useState<any | null>(null);
  const [myList, setMyList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Sync URL with Detail View ──
  useEffect(() => {
    if (!feed || !urlTmdbId) {
      if (!urlTmdbId && activeDetailMovie) {
        setActiveDetailMovie(null);
      }
      return;
    }

    // Try to find the movie in the feed or myList
    const findMovie = () => {
      // Check hero movies
      const heroes = [feed.heroHome, feed.heroMovies, feed.heroShows];
      const foundHero = heroes.find(m => m && (String(m.id) === urlTmdbId || String(m._id) === urlTmdbId));
      if (foundHero) return foundHero;

      // Check rows
      const allRows = [
        ...Object.values(feed.home || {}),
        ...Object.values(feed.movies || {}),
        ...Object.values(feed.shows || {}),
        myList
      ];
      for (const row of allRows) {
        const found = (row as any[]).find(m => m && (String(m.id) === urlTmdbId || String(m._id) === urlTmdbId));
        if (found) return found;
      }
      return null;
    };

    const movie = findMovie();
    if (movie) {
      setActiveDetailMovie(movie);
      // If we don't have focus in details yet, set it
      if (zone !== 100 && zone !== 101 && zone !== 102) {
        setFocus(100, 1, 'keyboard');
      }
    } else {
      // If not found in feed, try to fetch from backend
      const fetchFromBackend = async () => {
        try {
          const response = await fetch(`${API}/movies/details/${urlTmdbId}`, {
            credentials: 'include',
          });
          const data = await response.json();
          if (data.success && data.movie) {
            setActiveDetailMovie(data.movie);
            if (zone !== 100 && zone !== 101 && zone !== 102) {
              setFocus(100, 1, 'keyboard');
            }
          } else {
            navigate('/home', { replace: true });
          }
        } catch (err) {
          console.error('Failed to fetch movie details:', err);
          navigate('/home', { replace: true });
        }
      };

      fetchFromBackend();
    }
  }, [urlTmdbId, feed, myList, navigate, setFocus]);

  const onPlayMovie = useCallback((movie: any, season?: number, episode?: number) => {
    const type = movie.media_type || (movie.title ? 'movie' : 'tv');
    if (type === 'movie') {
      navigate(`/watch/movie/${movie.id || movie._id}`, { state: { movie } });
    } else {
      const s = season ?? 1;
      const e = episode ?? 1;
      navigate(`/watch/tv/${movie.id || movie._id}/${s}/${e}`, { state: { movie } });
    }
    // Stop trailer preview when entering playback
    setTrailerMovie(null);
  }, [navigate]);

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
      setTimeout(() => setTrailerVisible(false), 0);
    }
  }, [trailerMovie]);

  const onOpenDetails = useCallback((movie: any) => {
    lastFocusBeforeDetails.current = { zone, item };
    navigate(`/${movie.id || movie._id}`);
  }, [zone, item, navigate]);

  const onCloseDetails = useCallback(() => {
    navigate('/home', { replace: true });
    setIsEpisodesView(false);
    if (lastFocusBeforeDetails.current) {
      const { zone: z, item: i } = lastFocusBeforeDetails.current;
      setFocus(z, i, 'keyboard');
    }
  }, [navigate, setFocus]);

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
  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' });
    } catch { /* ignore */ }
    onLogout();
    navigate('/login', { replace: true });
  }, [onLogout, navigate]);

  // ── Navbar selection via keyboard / gamepad (zone 0) ──
  const prevSelect = useRef(0);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (zone === 0) {
      if (item === 6) {
        handleLogout();
      } else {
        const tab = TABS[item];
        if (tab) {
          setTimeout(() => setActiveTab(tab), 0);
        }
      }
    }
  }, [selectCount, zone, item, handleLogout]);

  // ── Back action ──
  const prevBack = useRef(0);
  useEffect(() => {
    if (backCount <= prevBack.current) return;
    prevBack.current = backCount;
    if (activeDetailMovie) {
      if (isEpisodesView) {
        return; // Handled by MovieDetail internally
      }
      setTimeout(() => onCloseDetails(), 0);
    } else if (activeTab !== 'home') {
      setTimeout(() => setActiveTab('home'), 0);
    }
  }, [backCount, activeTab, activeDetailMovie, onCloseDetails, isEpisodesView]);

  // Reset focus to Hero (Zone 1) when switching tabs if we are currently in rows
  const zoneRef = useRef(zone);
  useEffect(() => {
    zoneRef.current = zone;
  }, [zone]);

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
      const [, movies] = rows[rowIndex];
      return movies[item] ?? null;
    }
    return null;
  };
  const currentFocusedMovie = getFocusedMovie();

  // Reset glow animation on focus transition during render phase to avoid effect side-effects
  const focusKey = `${zone}-${item}`;
  const [prevFocusKey, setPrevFocusKey] = useState('');
  if (focusKey !== prevFocusKey) {
    setPrevFocusKey(focusKey);
    setGlowVisible(false);
  }

  // Delay the ambient glow animation for premium visual reveal
  useEffect(() => {
    if (!currentFocusedMovie) return;

    const t = setTimeout(() => {
      setGlowVisible(true);
    }, 1800);
    return () => clearTimeout(t);
  }, [focusKey, currentFocusedMovie]);

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
          {activeTab === 'search' ? (
            <SearchPage key="search" onOpenDetails={onOpenDetails} />
          ) : ['home', 'movies', 'shows'].includes(activeTab) ? (
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
                    onPlay={onPlayMovie}
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
            isEpisodesView={isEpisodesView}
            setIsEpisodesView={setIsEpisodesView}
            onStopTrailer={onStopTrailer}
            onPlay={onPlayMovie}
          />
        )}
      </AnimatePresence>

      {/* ── Controller hints overlay ── */}
      <ControllerHints />

      {/* Global Volume Overlay */}
      <AnimatePresence>
        {showVolumeOverlay && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="fixed top-8 right-8 z-[999] bg-black/80 backdrop-blur-md px-6 py-4 rounded-2xl flex items-center gap-4 border border-white/10 shadow-2xl pointer-events-none"
          >
            {(volume === 0 || muted) ? <VolumeX className="w-8 h-8 text-red-500" /> : <Volume2 className="w-8 h-8 text-white" />}
            <div className="flex flex-col gap-1">
              <span className="text-sm font-bold tracking-wider text-white/60 uppercase">Volume</span>
              <div className="w-32 h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white transition-all duration-200" style={{ width: `${(muted ? 0 : volume) * 100}%` }} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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

// ─────────────────────────────────────────────────────────
interface HomeProps {
  user: any;
  onLogout: () => void;
}

export function Home({ user, onLogout }: HomeProps) {
  return (
    <HomeContent user={user} onLogout={onLogout} />
  );
}
