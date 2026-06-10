import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Info } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';
import { useMute } from '../../context/MuteContext';
import {
  getTitle, getBackdropUrl, getLogoUrl, getTrailerKey,
  getYear, getRating, getTopCast,
} from '../../utils/movieHelpers';

const ZONE = 1;
const TRAILER_WARMUP_MS = 5000; // match FixedCard: 5s hidden warmup before reveal

interface HeroSectionProps {
  movie: any;
  onOpenDetails: (movie: any) => void;
  onStartTrailer: (movie: any, isHero: boolean) => void;
  onStopTrailer: (movie: any) => void;
  trailerPlaying: boolean;
  activeDetailMovieId?: string;
  onPlay: (movie: any, season?: number, episode?: number) => void;
}

export function HeroSection({
  movie,
  onOpenDetails,
  onStartTrailer,
  onStopTrailer,
  trailerPlaying,
  activeDetailMovieId,
  onPlay,
}: HeroSectionProps) {
  const { zone, item, selectCount, inputMode, setFocus, setInputMode } = useFocus();
  const { muted, toggleMute } = useMute();

  const isZoneFocused = zone === ZONE;
  const isPlayFocused = zone === ZONE && item === 0;
  const isInfoFocused = zone === ZONE && item === 1;

  const warmupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trailerKey = getTrailerKey(movie);

  // Trigger global trailer warmup timer
  useEffect(() => {
    // If the movie's detail page is open, start the trailer immediately!
    if (activeDetailMovieId === movie?._id && trailerKey) {
      if (warmupTimer.current) clearTimeout(warmupTimer.current);
      onStartTrailer(movie, true);
      return;
    }

    if (!trailerKey || !isZoneFocused) {
      if (warmupTimer.current) clearTimeout(warmupTimer.current);
      onStopTrailer(movie);
      return;
    }

    warmupTimer.current = setTimeout(() => {
      onStartTrailer(movie, true);
    }, TRAILER_WARMUP_MS);

    return () => {
      if (warmupTimer.current) clearTimeout(warmupTimer.current);
    };
  }, [trailerKey, isZoneFocused, movie, onStartTrailer, onStopTrailer, activeDetailMovieId]);

  // Select handler
  const prevSelect = useRef(0);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (isPlayFocused) {
      const isSeries = !!(movie?.episodes && movie.episodes.length > 0);
      if (isSeries) {
        const firstEp = movie.episodes[0];
        onPlay(movie, firstEp?.season_number ?? 1, firstEp?.episode_number ?? 1);
      } else {
        onPlay(movie);
      }
    } else if (isInfoFocused) {
      onOpenDetails(movie);
    }
  }, [selectCount, isPlayFocused, isInfoFocused, movie, onOpenDetails]);

  const backdropUrl = getBackdropUrl(movie);
  const logoUrl = getLogoUrl(movie);
  const title = getTitle(movie);
  const year = getYear(movie);
  const rating = getRating(movie);
  const cast = getTopCast(movie, 3);
  const overview = movie?.overview ?? '';

  return (
    <section
      className="relative pt-3 w-full"
      style={{ height: '100%' }}
    >
      <div
        className="relative mx-auto"
        style={{
          width: '94%',
          height: 'calc(100% - 12px)',
        }}
      >
        {/* ── Focus ring OUTSIDE the overflow-hidden card ── */}
        <AnimatePresence>
          {isZoneFocused && inputMode !== 'mouse' && (
            <motion.div
              key="hero-ring"
              className="absolute pointer-events-none"
              style={{
                left: '-3px',
                right: '-3px',
                top: '-3px',
                bottom: '-3px',
                border: '3px solid white',
                borderRadius: '19px',
                boxShadow: '0 0 15px rgba(255, 255, 255, 0.35)',
                zIndex: 30,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* ── The hero card ── */}
        <div
          className="relative overflow-hidden rounded-2xl w-full h-full"
          style={{
            zIndex: 5,
            backgroundColor: 'transparent',
            isolation: 'isolate',
            contain: 'paint',
          }}
        >
          {/* ── Backdrop — stays fully opaque; trailer fades IN on top, no bleed ── */}
          <motion.div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: backdropUrl ? `url(${backdropUrl})` : 'none',
              backgroundColor: '#141414',
              zIndex: 1,
            }}
            animate={{ opacity: trailerPlaying ? 0 : 1 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          />


          {/* ── Gradient overlays ── */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to right, rgba(0,0,0,0.88) 35%, rgba(0,0,0,0.35) 65%, transparent 100%)',
              zIndex: 3,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to top, #141414 0%, rgba(20,20,20,0.6) 30%, transparent 60%)',
              zIndex: 3,
            }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 20%)',
              zIndex: 3,
            }}
          />

          {/* ── Content ── */}
          <div className="absolute bottom-0 left-0 px-14 pb-14 flex flex-col gap-6 max-w-[800px]" style={{ zIndex: 10 }}>
            {logoUrl ? (
              <motion.img
                src={logoUrl}
                alt={title}
                className="object-contain object-left"
                style={{ maxHeight: '160px', maxWidth: '540px' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              />
            ) : (
              <motion.h1
                className="text-white font-black"
                style={{
                  fontSize: 'clamp(2.5rem, 6vw, 4.5rem)',
                  lineHeight: 1.05,
                  textShadow: '0 2px 12px rgba(0,0,0,0.9)',
                }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              >
                {title}
              </motion.h1>
            )}

            <motion.div
              className="flex items-center gap-3 flex-wrap"
              style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1rem' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.08 }}
            >
              {year && <span className="font-medium">{year}</span>}
              {movie?.certification && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="border border-white/40 px-2 py-0.5 text-sm rounded font-medium">{movie.certification}</span>
                </>
              )}
              {rating && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-yellow-400 font-bold">★ {rating}</span>
                </>
              )}
              {cast && (
                <>
                  <span className="text-white/30">•</span>
                  <span className="text-white/65">{cast}</span>
                </>
              )}
            </motion.div>

            {overview && (
              <motion.p
                className="text-base leading-relaxed"
                style={{
                  color: 'rgba(255,255,255,0.72)',
                  display: '-webkit-box',
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  maxWidth: '700px',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.12 }}
              >
                {overview}
              </motion.p>
            )}

            <motion.div
              className="flex items-center gap-4 mt-2"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
            >
              <motion.button
                id="hero-play-btn"
                onClick={() => {
                  setFocus(ZONE, 0, 'mouse');
                  onPlay(movie);
                }}
                onMouseEnter={() => { setInputMode('mouse'); setFocus(ZONE, 0, 'mouse'); }}
                animate={{
                  scale: isPlayFocused ? 1.06 : 1,
                  backgroundColor: isPlayFocused ? '#ffffff' : 'rgba(255,255,255,0.92)',
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="flex items-center gap-2.5 px-10 py-4 rounded font-bold text-black text-base"
                style={{
                  outline: isPlayFocused ? '2px solid white' : 'none',
                  outlineOffset: '3px',
                }}
              >
                <Play size={22} fill="black" />
                Play
              </motion.button>

              <motion.button
                id="hero-info-btn"
                onMouseEnter={() => { setInputMode('mouse'); setFocus(ZONE, 1, 'mouse'); }}
                onClick={() => {
                  setFocus(ZONE, 1, 'mouse');
                  onOpenDetails(movie);
                }}
                animate={{
                  scale: isInfoFocused ? 1.06 : 1,
                  backgroundColor: isInfoFocused ? 'rgba(255,255,255,0.28)' : 'rgba(109,109,110,0.72)',
                }}
                transition={{ type: 'spring', stiffness: 280, damping: 24 }}
                className="flex items-center gap-2.5 px-10 py-4 rounded font-bold text-white text-base"
                style={{
                  outline: isInfoFocused ? '2px solid rgba(255,255,255,0.6)' : 'none',
                  outlineOffset: '3px',
                }}
              >
                <Info size={22} />
                More Info
              </motion.button>
            </motion.div>
          </div>

          {/* ── Mute / Unmute button — appears when Hero is active ── */}
          <AnimatePresence>
            {isZoneFocused && (
              <motion.button
                className="absolute bottom-6 right-8 flex flex-col items-center gap-1 select-none"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2, delay: 0.2 }}
                onClick={toggleMute}
                style={{ zIndex: 20 }}
                aria-label={muted ? 'Unmute trailer' : 'Mute trailer'}
              >
                {/* Triangle / △ gamepad button indicator */}
                <div
                  style={{
                    width: 0,
                    height: 0,
                    borderLeft: '6px solid transparent',
                    borderRight: '6px solid transparent',
                    borderBottom: '10px solid rgba(255,255,255,0.55)',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))',
                  }}
                />
                {/* Speaker icon circle */}
                <div
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 46,
                    height: 46,
                    background: 'rgba(0,0,0,0.55)',
                    backdropFilter: 'blur(6px)',
                    border: '1.5px solid rgba(255,255,255,0.3)',
                  }}
                >
                  {muted ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
                      <line x1="23" y1="9" x2="17" y2="15" />
                      <line x1="17" y1="9" x2="23" y2="15" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  )}
                </div>
              </motion.button>
            )}
          </AnimatePresence>

        </div>
      </div>
    </section>
  );
}
