import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFocus } from '../../context/FocusContext';
import { useMute } from '../../context/MuteContext';
import {
  getTitle, getYear, getRating, getPosterUrl, getBackdropUrl, getLogoUrl,
  getTrailerKey,
} from '../../utils/movieHelpers';

// ── Constants ───────────────────────────────────────────────────────────
// These are FIXED. They must never change based on content. This is what
// keeps the layout perfectly locked even as cards expand.
export const CARD_W = 260;
export const CARD_H = 390;
export const GAP = 24;
export const EXPANDED_W = 700;
export const METADATA_H = 110; // Reserved space below the card strip for metadata text
export const ROW_H = CARD_H + METADATA_H + 36;

interface MovieRowProps {
  title: string;
  movies: any[];
  zone: number;
  onOpenDetails: (movie: any) => void;
  onStartTrailer: (movie: any, isHero: boolean) => void;
  onStopTrailer: (movie: any) => void;
  trailerMovie: any;
  trailerVisible: boolean;
  trailerIsHero: boolean;
  activeDetailMovieId?: string;
}

export function MovieRow({
  title,
  movies,
  zone: rowZone,
  onOpenDetails,
  onStartTrailer,
  onStopTrailer,
  trailerMovie,
  trailerVisible,
  trailerIsHero,
  activeDetailMovieId,
}: MovieRowProps) {
  const { zone, item, selectCount, registerZone, unregisterZone, setFocus, setInputMode, zoneItemMemory } = useFocus();

  const rowRef = useRef<HTMLDivElement>(null);
  const isRowFocused = zone === rowZone;
  const displayFocusedIdx = isRowFocused ? item : (zoneItemMemory[rowZone] ?? 0);
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    setDetailsVisible(false);
    if (!isRowFocused) return;

    // Show details after the card is expanded (1150ms)
    const detailsTimer = setTimeout(() => {
      setDetailsVisible(true);
    }, 1150);

    return () => {
      clearTimeout(detailsTimer);
    };
  }, [isRowFocused, displayFocusedIdx]);

  useEffect(() => {
    if (movies.length > 0) registerZone(rowZone, movies.length);
    return () => unregisterZone(rowZone);
  }, [rowZone, movies.length, registerZone, unregisterZone]);

  const prevSelect = useRef(0);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (isRowFocused && movies[item]) {
      console.log('Selected movie:', getTitle(movies[item]), movies[item]._id);
      onOpenDetails(movies[item]);
    }
  }, [selectCount, isRowFocused, item, movies, onOpenDetails]);

  if (!movies.length) return null;

  // The entire strip translates so card at displayFocusedIdx is always at x=56 (px-14 = 56px)
  const scrollX = -displayFocusedIdx * (CARD_W + GAP);

  const focusedMovie = movies[displayFocusedIdx];
  const year = focusedMovie ? getYear(focusedMovie) : null;
  const rating = focusedMovie ? getRating(focusedMovie) : null;
  const cert = focusedMovie?.certification;
  const overview = focusedMovie?.overview;

  return (
    <div
      ref={rowRef}
      className="relative w-full"
      style={{ height: CARD_H + METADATA_H + 36 /* title */ }}
    >
      {/* Row title */}
      <h2
        className="px-14 mb-2 font-semibold transition-opacity duration-300"
        style={{
          fontSize: '1.45rem',
          letterSpacing: '0.01em',
          color: isRowFocused ? '#fff' : 'rgba(255,255,255,0.5)',
          height: '28px',
          lineHeight: '28px',
          marginBottom: '8px',
        }}
      >
        {title}
      </h2>

      {/* Card strip — fixed height, overflow-visible so expanded card peeks out, but metadata is outside */}
      <div className="overflow-hidden" style={{ height: CARD_H, paddingLeft: 56 }}>
        <motion.div
          className="flex items-start"
          style={{ gap: GAP }}
          animate={{ x: scrollX }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, mass: 0.8 }}
        >
          {movies.map((movie, idx) => {
            const isFocused = isRowFocused && displayFocusedIdx === idx;
            return (
              <FixedCard
                key={movie._id ?? idx}
                movie={movie}
                isFocused={isFocused}
                onClick={() => {
                  setInputMode('mouse');
                  if (isFocused) {
                    onOpenDetails(movie);
                  } else {
                    setFocus(rowZone, idx, 'mouse');
                  }
                }}
                onStartTrailer={onStartTrailer}
                onStopTrailer={onStopTrailer}
                trailerPlaying={trailerMovie?._id === movie._id && trailerVisible && !trailerIsHero}
                activeDetailMovieId={activeDetailMovieId}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Metadata panel — rendered BELOW the strip, completely outside the card layout */}
      {/* It's in absolute position within the row container, so it NEVER shifts siblings */}
      <AnimatePresence>
        {detailsVisible && focusedMovie && (
          <motion.div
            key={`meta-${focusedMovie._id ?? displayFocusedIdx}`}
            className="absolute left-14 right-14"
            style={{ top: CARD_H + 36 + 12 }}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          >
             {/* Metadata row */}
            <div className="flex items-center gap-3 text-[15px] mb-3" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {cert && (
                <span className="border border-white/35 px-1.5 py-px rounded text-[11px] text-white/75 uppercase">{cert}</span>
              )}
              {year && <span className="text-white font-medium">{year}</span>}
              {rating && (
                <span className="text-green-400 font-semibold">{Math.round(Number(rating) * 10)}% Match</span>
              )}
              {focusedMovie?.duration && (
                <span className="text-white/80">{focusedMovie.duration}</span>
              )}
              {focusedMovie?.episodes && focusedMovie.episodes.length > 0 && (
                <span className="text-white/80">{focusedMovie.episodes.length} Episodes</span>
              )}
              <span className="border border-white/35 px-1.5 py-px rounded text-[11px] text-white/75">HD</span>
            </div>
            {overview && (
              <p
                className="text-lg text-white/80 leading-relaxed overflow-hidden"
                style={{
                  maxWidth: '65%',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  maxHeight: '3.8em',
                  textOverflow: 'ellipsis'
                }}
              >
                {overview}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Fixed-height card that only expands horizontally ─────────────────────
interface FixedCardProps {
  movie: any;
  isFocused: boolean;
  onClick: () => void;
  onStartTrailer: (movie: any, isHero: boolean) => void;
  onStopTrailer: (movie: any) => void;
  trailerPlaying: boolean;
  activeDetailMovieId?: string;
}

function FixedCard({
  movie,
  isFocused,
  onClick,
  onStartTrailer,
  onStopTrailer,
  trailerPlaying,
  activeDetailMovieId,
}: FixedCardProps) {
  const { muted, toggleMute } = useMute();

  const [isExpanded, setIsExpanded] = useState(false);
  const expandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trailerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [zIndex, setZIndex] = useState(1);

  // zIndex state machine: focused→20, collapsing→10, idle→1
  useEffect(() => {
    if (isFocused) {
      setZIndex(20);
    } else {
      setZIndex((prev) => (prev === 20 ? 10 : 1));
    }
  }, [isFocused]);

  // Expand timer: 500ms after focus
  useEffect(() => {
    if (isFocused) {
      expandTimer.current = setTimeout(() => setIsExpanded(true), 500);
    } else {
      if (expandTimer.current) clearTimeout(expandTimer.current);
      setIsExpanded(false);
    }
    return () => {
      if (expandTimer.current) clearTimeout(expandTimer.current);
    };
  }, [isFocused]);

  const posterUrl = getPosterUrl(movie);
  const backdropUrl = getBackdropUrl(movie);
  const title = getTitle(movie);
  const logoUrl = getLogoUrl(movie);
  const trailerKey = getTrailerKey(movie);

  // 5-second trailer timer delegated to global player
  useEffect(() => {
    // If details are open for this specific movie, start the trailer immediately!
    if (activeDetailMovieId === movie?._id && trailerKey) {
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
      onStartTrailer(movie, false);
      return;
    }

    if (isExpanded && trailerKey) {
      trailerTimer.current = setTimeout(() => {
        onStartTrailer(movie, false);
      }, 5000);
    } else {
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
      onStopTrailer(movie);
    }
    return () => {
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
    };
  }, [isExpanded, trailerKey, movie, onStartTrailer, onStopTrailer, activeDetailMovieId]);

  // The card is ALWAYS CARD_H tall — it only widens.
  return (
    <motion.div
      className="relative shrink-0 rounded-lg overflow-hidden cursor-pointer select-none"
      animate={{ width: isExpanded ? EXPANDED_W : CARD_W, scale: 1.0, y: 0 }}
      transition={{ type: 'spring', stiffness: 120, damping: 22, mass: 1.1 }}
      style={{ height: CARD_H, zIndex, backgroundColor: 'transparent' }}
      onClick={onClick}
      onAnimationComplete={() => {
        if (!isFocused) setZIndex(1);
      }}
    >
      {/* Poster image (always shown, fades out when trailer goes visible) */}
      <motion.img
        key="poster-or-backdrop"
        src={isExpanded ? (backdropUrl ?? posterUrl ?? '') : (posterUrl ?? '')}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
        animate={{ opacity: trailerPlaying ? 0 : 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ zIndex: 1 }}
      />

      {/* Gradient overlay — shown when expanded so text is readable */}
      {isExpanded && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, transparent 50%)',
            zIndex: 3,
          }}
        />
      )}

      {/* Logo / title over bottom-left — only when expanded */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            className="absolute bottom-4 left-4 right-14"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25, delay: 0.1 }}
            style={{ zIndex: 10 }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={title}
                className="max-h-16 max-w-[60%] object-contain drop-shadow-md"
                draggable={false}
              />
            ) : (
              <h3
                className="text-white font-bold drop-shadow-lg line-clamp-1"
                style={{ fontSize: '1.6rem' }}
              >
                {title}
              </h3>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mute / Unmute button — bottom-right corner, only when expanded */}
      <AnimatePresence>
        {isExpanded && trailerPlaying && (
          <motion.button
            className="absolute bottom-4 right-4 flex flex-col items-center gap-1 select-none"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2, delay: 0.15 }}
            onClick={(e) => {
              e.stopPropagation();
              toggleMute();
            }}
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
                width: 34,
                height: 34,
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(6px)',
                border: '1.5px solid rgba(255,255,255,0.3)',
              }}
            >
              {muted ? (
                /* Muted: speaker with X lines */
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </svg>
              ) : (
                /* Unmuted: speaker with waves */
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="white" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </svg>
              )}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Focus ring / Highlighted Border */}
      {isFocused && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none z-30"
          style={{ boxShadow: 'inset 0 0 0 3px #ffffff, 0 10px 30px rgba(0,0,0,0.8)' }}
        />
      )}
    </motion.div>
  );
}
