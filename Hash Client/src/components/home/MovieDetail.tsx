import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, ThumbsUp, ThumbsDown, ArrowLeft, Layers, Sparkles } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';
import { useMute } from '../../context/MuteContext';
import {
  getTitle,
  getYear,
  getRating,
  getTopCast,
  getLogoUrl,
  getBackdropUrl,
} from '../../utils/movieHelpers';

interface MovieDetailProps {
  movie: any;
  onBack: () => void;
  trailerPlaying: boolean;
}

export function MovieDetail({ movie, onBack, trailerPlaying }: MovieDetailProps) {
  const { zone, item, selectCount, registerZone, unregisterZone, setFocus } = useFocus();
  const { muted, toggleMute } = useMute();
  
  const [thumbState, setThumbState] = useState<'up' | 'down' | null>(null);

  const isSeries = !!(movie?.episodes && movie.episodes.length > 0);
  
  // Calculate focus items
  const focusItems = useMemo(() => {
    const items: string[] = ['back', 'play'];
    if (isSeries) items.push('episodes');
    items.push('more-like-this');
    items.push('thumbs-up');
    items.push('thumbs-down');
    items.push('mute');
    return items;
  }, [isSeries]);

  const DETAIL_ZONE = 100;

  useEffect(() => {
    registerZone(DETAIL_ZONE, focusItems.length);
    // Set initial focus to the Play button (item 1) in the detail zone
    setFocus(DETAIL_ZONE, focusItems.indexOf('play'), 'keyboard');
    return () => {
      unregisterZone(DETAIL_ZONE);
    };
  }, [registerZone, unregisterZone, setFocus, focusItems.length]);

  // selection logic via gamepad/enter
  const prevSelect = useRef(0);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (zone !== DETAIL_ZONE) return;

    const activeItem = focusItems[item];
    if (activeItem === 'back') {
      onBack();
    } else if (activeItem === 'mute') {
      toggleMute();
    } else if (activeItem === 'thumbs-up') {
      setThumbState(p => p === 'up' ? null : 'up');
    } else if (activeItem === 'thumbs-down') {
      setThumbState(p => p === 'down' ? null : 'down');
    }
  }, [selectCount, zone, item, focusItems, onBack, toggleMute]);

  // Back action listener inside details view
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const title = getTitle(movie);
  const logoUrl = getLogoUrl(movie);
  const backdropUrl = getBackdropUrl(movie);
  const year = getYear(movie);
  const rating = getRating(movie);
  const cast = getTopCast(movie, 3);
  const overview = movie?.overview ?? '';
  const cert = movie?.certification ?? '16+';
  const duration = movie?.duration ?? '2h 15m';

  // Stagger animation container
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const childVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 120,
        damping: 18,
      },
    },
  };

  return (
    <div className="absolute inset-0 w-full h-full z-60 overflow-hidden text-white font-sans bg-transparent">
      {/* Back button (Top Left) */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          setFocus(DETAIL_ZONE, focusItems.indexOf('back'));
          onBack();
        }}
        onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('back'), 'mouse')}
        className={`absolute top-8 left-14 z-50 flex items-center justify-center w-12 h-12 rounded-full transition-all group ${
          zone === DETAIL_ZONE && focusItems[item] === 'back'
            ? 'bg-white text-black scale-110 shadow-lg'
            : 'bg-black/40 border border-white/10 text-white hover:bg-black/70 hover:border-white/30'
        }`}
        style={{
          outline: zone === DETAIL_ZONE && focusItems[item] === 'back' ? '2px solid white' : 'none',
          outlineOffset: '4px',
        }}
        aria-label="Go Back"
      >
        <ArrowLeft className={`w-6 h-6 transition-transform ${zone === DETAIL_ZONE && focusItems[item] === 'back' ? 'text-black' : 'text-white group-hover:scale-110'}`} />
      </motion.button>

      {/* Static Backdrop Image / Black screen (fades out if trailer is playing) */}
      <AnimatePresence>
        {!trailerPlaying && (
          <motion.div
            key="static-bg"
            className="absolute inset-0 w-full h-full pointer-events-none bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            style={{ zIndex: 1 }}
          >
            {backdropUrl && (
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-90"
                style={{
                  backgroundImage: `url(${backdropUrl})`,
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dark Vignette / Left Gradient Overlay */}
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.4) 60%, transparent 100%)',
        }}
      />
      <div
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
        }}
      />

      {/* Main Details Panel (Left Column) */}
      <motion.div
        className="absolute left-14 top-24 z-20 max-w-[45%] flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* N Badge */}
        <motion.div className="flex items-center gap-2" variants={childVariants}>
          <span className="text-red-600 font-extrabold text-3xl tracking-tighter" style={{ fontFamily: 'sans-serif' }}>N</span>
          <span className="text-white/60 tracking-[0.3em] text-[11px] font-semibold uppercase">
            {isSeries ? 'Series' : 'Movie'}
          </span>
        </motion.div>

        {/* Title Logo or Text */}
        <motion.div variants={childVariants}>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={title}
              className="max-h-28 max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
              draggable={false}
            />
          ) : (
            <h1 className="text-5xl font-black tracking-tight leading-none drop-shadow-md">
              {title}
            </h1>
          )}
        </motion.div>

        {/* Metadata Row */}
        <motion.div className="flex flex-wrap items-center gap-3 text-sm text-white/75" variants={childVariants}>
          {rating && (
            <span className="text-green-400 font-bold tracking-wide">
              {Math.round(Number(rating) * 10)}% Match
            </span>
          )}
          {year && <span className="font-semibold">{year}</span>}
          {isSeries ? (
            <span className="font-semibold">{movie.episodes?.length ?? 6} Episodes</span>
          ) : (
            <span className="font-semibold">{duration}</span>
          )}
          <span className="border border-white/30 px-1.5 py-[2px] rounded text-[10px] font-bold tracking-wider leading-none">HD</span>
          <span className="border border-white/30 px-1.5 py-[2px] rounded text-[10px] font-bold tracking-wider leading-none">AD/CC</span>
        </motion.div>

        {/* Certification / Age Rating & Descriptors */}
        <motion.div className="flex items-center gap-2 text-xs" variants={childVariants}>
          <span className="bg-zinc-800 border border-zinc-700 px-2 py-[3px] rounded font-bold text-white/90">
            {cert}
          </span>
          <span className="text-white/60 font-medium">Sex, Violence, Language</span>
        </motion.div>

        {/* Description / Synopsis */}
        <motion.p
          className="text-base text-white/90 leading-relaxed font-light drop-shadow-sm"
          variants={childVariants}
        >
          {overview}
        </motion.p>

        {/* Cast List */}
        {cast && (
          <motion.div className="text-xs text-white/50 font-normal leading-normal" variants={childVariants}>
            <span className="text-white/40">Cast: </span>{cast}
          </motion.div>
        )}

        {/* Feedback Icons */}
        <motion.div className="flex items-center gap-3 mt-1" variants={childVariants}>
          <motion.button
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
              zone === DETAIL_ZONE && focusItems[item] === 'thumbs-up'
                ? 'bg-white border-transparent text-black scale-110 shadow-lg'
                : thumbState === 'up'
                ? 'bg-green-500/20 border-green-500 text-green-400'
                : 'border-white/20 bg-black/30 text-white/80 hover:border-white/50 hover:text-white'
            }`}
            onClick={() => {
              setFocus(DETAIL_ZONE, focusItems.indexOf('thumbs-up'));
              setThumbState(p => p === 'up' ? null : 'up');
            }}
            onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('thumbs-up'), 'mouse')}
            whileTap={{ scale: 0.85 }}
            style={{
              outline: zone === DETAIL_ZONE && focusItems[item] === 'thumbs-up' ? '2px solid white' : 'none',
              outlineOffset: '2px',
            }}
            aria-label="Thumbs Up"
          >
            <motion.div animate={thumbState === 'up' ? { scale: [1, 1.4, 1], rotate: [0, -15, 10, 0] } : {}}>
              <ThumbsUp className={`w-4 h-4 ${(zone === DETAIL_ZONE && focusItems[item] === 'thumbs-up') || thumbState === 'up' ? 'fill-current' : ''}`} />
            </motion.div>
          </motion.button>
          <motion.button
            className={`w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
              zone === DETAIL_ZONE && focusItems[item] === 'thumbs-down'
                ? 'bg-white border-transparent text-black scale-110 shadow-lg'
                : thumbState === 'down'
                ? 'bg-red-500/20 border-red-500 text-red-400'
                : 'border-white/20 bg-black/30 text-white/80 hover:border-white/50 hover:text-white'
            }`}
            onClick={() => {
              setFocus(DETAIL_ZONE, focusItems.indexOf('thumbs-down'));
              setThumbState(p => p === 'down' ? null : 'down');
            }}
            onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('thumbs-down'), 'mouse')}
            whileTap={{ scale: 0.85 }}
            style={{
              outline: zone === DETAIL_ZONE && focusItems[item] === 'thumbs-down' ? '2px solid white' : 'none',
              outlineOffset: '2px',
            }}
            aria-label="Thumbs Down"
          >
            <motion.div animate={thumbState === 'down' ? { scale: [1, 1.4, 1], rotate: [0, 15, -10, 0] } : {}}>
              <ThumbsDown className={`w-4 h-4 ${(zone === DETAIL_ZONE && focusItems[item] === 'thumbs-down') || thumbState === 'down' ? 'fill-current' : ''}`} />
            </motion.div>
          </motion.button>
        </motion.div>

        {/* Action Buttons Stack */}
        <motion.div className="flex flex-col gap-3 mt-1.5 max-w-[280px]" variants={childVariants}>
          {/* Play Button */}
          <motion.button
            className={`flex items-center justify-center gap-2.5 py-3 rounded-lg font-semibold tracking-wide transition-all bg-white text-black ${
              zone === DETAIL_ZONE && focusItems[item] === 'play'
                ? 'scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                : 'hover:bg-white/95'
            }`}
            onClick={() => setFocus(DETAIL_ZONE, focusItems.indexOf('play'))}
            onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('play'), 'mouse')}
            whileTap={{ scale: 0.96 }}
            style={{
              outline: zone === DETAIL_ZONE && focusItems[item] === 'play' ? '2px solid white' : 'none',
              outlineOffset: '2px',
            }}
          >
            <Play className="w-5 h-5 fill-current" />
            <span>{isSeries ? 'Play Episode 1' : 'Play'}</span>
          </motion.button>

          {/* Episodes & More Button (Series Only) */}
          {isSeries && (
            <motion.button
              className={`flex items-center justify-center gap-2.5 py-3 rounded-lg font-semibold tracking-wide transition-all border bg-black/40 border-white/20 text-white/90 ${
                zone === DETAIL_ZONE && focusItems[item] === 'episodes'
                  ? 'scale-105 border-white/40 bg-black/60'
                  : 'hover:border-white/40 hover:bg-black/60'
              }`}
              onClick={() => setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'))}
              onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'mouse')}
              whileTap={{ scale: 0.96 }}
              style={{
                outline: zone === DETAIL_ZONE && focusItems[item] === 'episodes' ? '2px solid white' : 'none',
                outlineOffset: '2px',
              }}
            >
              <Layers className="w-5 h-5" />
              <span>Episodes & More</span>
            </motion.button>
          )}

          {/* More Like This Button */}
          <motion.button
            className={`flex items-center justify-center gap-2.5 py-3 rounded-lg font-semibold tracking-wide transition-all border bg-black/40 border-white/20 text-white/90 ${
              zone === DETAIL_ZONE && focusItems[item] === 'more-like-this'
                ? 'scale-105 border-white/40 bg-black/60'
                : 'hover:border-white/40 hover:bg-black/60'
              }`}
            onClick={() => setFocus(DETAIL_ZONE, focusItems.indexOf('more-like-this'))}
            onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('more-like-this'), 'mouse')}
            whileTap={{ scale: 0.96 }}
            style={{
              outline: zone === DETAIL_ZONE && focusItems[item] === 'more-like-this' ? '2px solid white' : 'none',
              outlineOffset: '2px',
            }}
          >
            <Sparkles className="w-5 h-5" />
            <span>More Like This</span>
          </motion.button>
        </motion.div>
      </motion.div>

      {/* ── Mute / Unmute button in the bottom right corner ── */}
      <motion.button
        className="absolute bottom-8 right-14 flex flex-col items-center gap-1 select-none transition-all"
        onClick={(e) => {
          e.stopPropagation();
          toggleMute();
        }}
        onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('mute'), 'mouse')}
        whileTap={{ scale: 0.9 }}
        style={{ zIndex: 50, outline: 'none' }}
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
          className={`flex items-center justify-center rounded-full transition-all ${
            zone === DETAIL_ZONE && focusItems[item] === 'mute'
              ? 'bg-white text-black scale-110 shadow-lg'
              : 'bg-black/55 backdrop-blur-md border border-white/30 text-white hover:bg-black/70 hover:border-white/50'
          }`}
          style={{
            width: 38,
            height: 38,
            outline: zone === DETAIL_ZONE && focusItems[item] === 'mute' ? '2px solid white' : 'none',
            outlineOffset: '4px',
          }}
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </div>
      </motion.button>
    </div>
  );
}
