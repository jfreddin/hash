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
  isEpisodesView: boolean;
  setIsEpisodesView: (val: boolean) => void;
  onStopTrailer?: (movie: any) => void;
  onPlay: (movie: any, season?: number, episode?: number) => void;
}

export function MovieDetail({
  movie,
  onBack,
  trailerPlaying,
  isEpisodesView,
  setIsEpisodesView,
  onStopTrailer,
  onPlay,
}: MovieDetailProps) {
  const { zone, item, selectCount, backCount, registerZone, unregisterZone, setFocus } = useFocus();
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

  // Extract and group unique seasons from movie.episodes
  const seasons = useMemo(() => {
    if (!movie?.episodes) return [];
    const uniqueSeasons = Array.from(new Set(movie.episodes.map((ep: any) => ep.season_number ?? 1)));
    return uniqueSeasons.sort((a: any, b: any) => a - b);
  }, [movie]);

  const [activeSeasonIndex, setActiveSeasonIndex] = useState(0);
  const activeSeason = seasons[activeSeasonIndex] ?? 1;

  const activeEpisodes = useMemo(() => {
    if (!movie?.episodes) return [];
    return movie.episodes
      .filter((ep: any) => (ep.season_number ?? 1) === activeSeason)
      .sort((a: any, b: any) => (a.episode_number ?? 0) - (b.episode_number ?? 0));
  }, [movie, activeSeason]);

  // Sync active season when navigating up/down in the Seasons sidebar
  useEffect(() => {
    if (zone === 101 && item > 0) {
      setActiveSeasonIndex(item - 1);
    }
  }, [zone, item]);

  // Set initial focus to Play button (item 1) in DETAIL_ZONE (100) when MovieDetail mounts
  useEffect(() => {
    setFocus(DETAIL_ZONE, focusItems.indexOf('play'), 'keyboard');
  }, [setFocus, focusItems]);

  // Manage zone registrations dynamically
  useEffect(() => {
    if (isEpisodesView) {
      unregisterZone(DETAIL_ZONE);
      registerZone(101, seasons.length + 1); // +1 for Back button at index 0
      if (activeEpisodes.length > 0) {
        registerZone(102, activeEpisodes.length);
      }
    } else {
      unregisterZone(101);
      unregisterZone(102);
      registerZone(DETAIL_ZONE, focusItems.length);
    }
    return () => {
      unregisterZone(DETAIL_ZONE);
      unregisterZone(101);
      unregisterZone(102);
    };
  }, [isEpisodesView, seasons.length, activeEpisodes.length, focusItems.length, registerZone, unregisterZone]);

  // selection logic via gamepad/enter inside details view (zone 100)
  const prevSelect = useRef(selectCount);
  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (zone !== DETAIL_ZONE) return;

    const activeItem = focusItems[item];
    if (activeItem === 'back') {
      onBack();
    } else if (activeItem === 'play') {
      const isSeries = !!(movie?.episodes && movie.episodes.length > 0);
      if (isSeries) {
        const firstEp = movie.episodes[0];
        onPlay(movie, firstEp?.season_number ?? 1, firstEp?.episode_number ?? 1);
      } else {
        onPlay(movie);
      }
    } else if (activeItem === 'mute') {
      toggleMute();
    } else if (activeItem === 'thumbs-up') {
      setThumbState(p => p === 'up' ? null : 'up');
    } else if (activeItem === 'thumbs-down') {
      setThumbState(p => p === 'down' ? null : 'down');
    } else if (activeItem === 'episodes') {
      setIsEpisodesView(true);
      if (trailerPlaying && onStopTrailer) {
        onStopTrailer(movie);
      }
      unregisterZone(DETAIL_ZONE);
      registerZone(101, seasons.length + 1);
      setFocus(101, 1, 'keyboard');
    }
  }, [selectCount, zone, item, focusItems, onBack, toggleMute, isEpisodesView, seasons.length, trailerPlaying, onStopTrailer, movie, registerZone, unregisterZone, setFocus]);

  // selection logic inside episodes/seasons view (zones 101 & 102)
  const prevSelectEpisodes = useRef(selectCount);
  useEffect(() => {
    if (selectCount <= prevSelectEpisodes.current) return;
    prevSelectEpisodes.current = selectCount;

    if (isEpisodesView) {
      if (zone === 101) {
        if (item === 0) {
          // Back button selected
          setIsEpisodesView(false);
          unregisterZone(101);
          unregisterZone(102);
          registerZone(DETAIL_ZONE, focusItems.length);
          setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'keyboard');
        } else {
          // Season clicked - move focus to the episodes column
          if (activeEpisodes.length > 0) {
            setFocus(102, 0, 'keyboard');
          }
        }
      } else if (zone === 102) {
        const ep = activeEpisodes[item];
        if (ep) {
          onPlay(movie, ep.season_number ?? 1, ep.episode_number ?? 1);
        }
      }
    }
  }, [selectCount, zone, item, isEpisodesView, activeEpisodes, focusItems, setFocus, registerZone, unregisterZone, setIsEpisodesView]);

  // Back action listener inside episodes view (zones 101 & 102) via gamepad/backspace
  const prevBackEpisodes = useRef(backCount);
  useEffect(() => {
    if (backCount <= prevBackEpisodes.current) return;
    prevBackEpisodes.current = backCount;
    if (isEpisodesView && (zone === 101 || zone === 102)) {
      setIsEpisodesView(false);
      unregisterZone(101);
      unregisterZone(102);
      registerZone(DETAIL_ZONE, focusItems.length);
      setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'keyboard');
    }
  }, [backCount, zone, isEpisodesView, registerZone, unregisterZone, focusItems, setFocus]);

  // Back action listener inside details view (keyboard Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEpisodesView) {
          setIsEpisodesView(false);
          unregisterZone(101);
          unregisterZone(102);
          registerZone(DETAIL_ZONE, focusItems.length);
          setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'keyboard');
        } else {
          onBack();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isEpisodesView, registerZone, unregisterZone, focusItems, setFocus]);

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
    <div
      className="absolute inset-0 w-full h-full z-60 overflow-hidden text-white bg-transparent"
      style={{ fontFamily: 'NetflixSans, "Helvetica Neue", Helvetica, Arial, sans-serif' }}
    >
      {/* Back button (Top Left) */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => {
          if (isEpisodesView) {
            setIsEpisodesView(false);
            unregisterZone(101);
            unregisterZone(102);
            registerZone(DETAIL_ZONE, focusItems.length);
            setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'keyboard');
          } else {
            setFocus(DETAIL_ZONE, focusItems.indexOf('back'));
            onBack();
          }
        }}
        onMouseEnter={() => {
          if (isEpisodesView) {
            setFocus(101, 0, 'mouse');
          } else {
            setFocus(DETAIL_ZONE, focusItems.indexOf('back'), 'mouse');
          }
        }}
        className={`absolute top-8 left-14 z-50 flex items-center justify-center w-12 h-12 rounded-full transition-all group ${
          (zone === DETAIL_ZONE && focusItems[item] === 'back') || (zone === 101 && item === 0)
            ? 'bg-white text-black scale-110 shadow-lg'
            : 'bg-black/40 border border-white/10 text-white hover:bg-black/70 hover:border-white/30'
        }`}
        style={{
          outline: ((zone === DETAIL_ZONE && focusItems[item] === 'back') || (zone === 101 && item === 0)) ? '2px solid white' : 'none',
          outlineOffset: '4px',
        }}
        aria-label="Go Back"
      >
        <ArrowLeft className={`w-6 h-6 transition-transform ${((zone === DETAIL_ZONE && focusItems[item] === 'back') || (zone === 101 && item === 0)) ? 'text-black' : 'text-white group-hover:scale-110'}`} />
      </motion.button>

      {/* Static Backdrop Image / Black screen (fades out if trailer is playing) */}
      <AnimatePresence>
        {(!trailerPlaying || isEpisodesView) && (
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

      {/* Conditional layouts based on isEpisodesView with smooth transitions */}
      <AnimatePresence mode="wait">
        {!isEpisodesView ? (
          /* Original Details Layout */
          <motion.div
            key="details-layout"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, x: -30 }}
            className="absolute left-14 top-24 z-20 max-w-[45%] flex flex-col gap-4"
          >
            {/* N Badge */}
            <motion.div className="flex items-center gap-1.5" variants={childVariants}>
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
                  className="max-h-24 max-w-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                  draggable={false}
                />
              ) : (
                <h1 className="text-5xl font-black tracking-tight leading-none drop-shadow-md">
                  {title}
                </h1>
              )}
            </motion.div>

            {/* Metadata Row */}
            <motion.div className="flex flex-wrap items-center gap-2.5 text-sm text-white/75" variants={childVariants}>
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
              <span className="border border-white/30 px-2 py-[2px] rounded text-[11px] font-bold tracking-wider leading-none">HD</span>
              <span className="border border-white/30 px-2 py-[2px] rounded text-[11px] font-bold tracking-wider leading-none">AD/CC</span>
            </motion.div>

            {/* Certification / Age Rating & Descriptors */}
            <motion.div className="flex items-center gap-2 text-xs" variants={childVariants}>
              <span className="bg-zinc-800 border border-zinc-700 px-2 py-[3px] rounded font-bold text-white/90 text-[11px] leading-none">
                {cert}
              </span>
              <span className="text-white/60 font-medium">Sex, Violence, Language</span>
            </motion.div>

            {/* Description / Synopsis */}
            <motion.p
              className="text-base text-white/90 leading-relaxed font-light drop-shadow-sm"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
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
            <motion.div className="flex items-center gap-2 mt-0.5" variants={childVariants}>
              <motion.button
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
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
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
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
            <motion.div className="flex flex-col gap-2.5 mt-1 max-w-[280px]" variants={childVariants}>
              {/* Play Button */}
              <motion.button
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-base tracking-wide transition-all bg-white text-black ${
                  zone === DETAIL_ZONE && focusItems[item] === 'play'
                    ? 'scale-105 shadow-[0_0_20px_rgba(255,255,255,0.4)]'
                    : 'hover:bg-white/95'
                }`}
                onClick={() => {
                  setFocus(DETAIL_ZONE, focusItems.indexOf('play'));
                  const isSeries = !!(movie?.episodes && movie.episodes.length > 0);
                  if (isSeries) {
                    const firstEp = movie.episodes[0];
                    onPlay(movie, firstEp?.season_number ?? 1, firstEp?.episode_number ?? 1);
                  } else {
                    onPlay(movie);
                  }
                }}
                onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('play'), 'mouse')}
                whileTap={{ scale: 0.96 }}
                style={{
                  outline: zone === DETAIL_ZONE && focusItems[item] === 'play' ? '2px solid white' : 'none',
                  outlineOffset: '2px',
                }}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isSeries ? 'Play Episode 1' : 'Play'}</span>
              </motion.button>

              {/* Episodes & More Button (Series Only) */}
              {isSeries && (
                <motion.button
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-base tracking-wide transition-all border bg-black/40 border-white/20 text-white/90 ${
                    zone === DETAIL_ZONE && focusItems[item] === 'episodes'
                      ? 'scale-105 border-white/40 bg-black/60'
                      : 'hover:border-white/40 hover:bg-black/60'
                  }`}
                  onClick={() => {
                    setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'));
                    setIsEpisodesView(true);
                    if (trailerPlaying && onStopTrailer) {
                      onStopTrailer(movie);
                    }
                    unregisterZone(DETAIL_ZONE);
                    registerZone(101, seasons.length + 1);
                    setFocus(101, 1, 'mouse');
                  }}
                  onMouseEnter={() => setFocus(DETAIL_ZONE, focusItems.indexOf('episodes'), 'mouse')}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    outline: zone === DETAIL_ZONE && focusItems[item] === 'episodes' ? '2px solid white' : 'none',
                    outlineOffset: '2px',
                  }}
                >
                  <Layers className="w-4 h-4" />
                  <span>Episodes & More</span>
                </motion.button>
              )}

              {/* More Like This Button */}
              <motion.button
                className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-base tracking-wide transition-all border bg-black/40 border-white/20 text-white/90 ${
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
                <Sparkles className="w-4 h-4" />
                <span>More Like This</span>
              </motion.button>
            </motion.div>
          </motion.div>
        ) : (
          /* Episodes & Seasons Screen Layout */
          <motion.div
            key="episodes-layout"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0 z-20 flex px-14 h-full w-full bg-black/40 backdrop-blur-md"
          >
            {/* Left Column: Seasons list */}
            <div className="w-[35%] h-full flex flex-col gap-4 pr-10 pt-24 pb-8">
              {/* N Badge & Logo */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-red-600 font-extrabold text-4xl tracking-tighter" style={{ fontFamily: 'sans-serif' }}>N</span>
                  <span className="text-white/60 tracking-[0.3em] text-[13px] font-semibold uppercase">Series</span>
                </div>
                <div className="min-h-16 flex items-end">
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
                </div>
              </div>

              {/* Metadata Row */}
              <div className="flex flex-wrap items-center gap-3.5 text-base text-white/75 mt-1">
                {year && <span className="font-semibold">{year}</span>}
                <span className="font-semibold">{movie.episodes?.length ?? 6} Episodes</span>
                <span className="border border-white/30 px-2.5 py-[3px] rounded text-[12px] font-bold tracking-wider leading-none">HD</span>
                <span className="bg-zinc-800 border border-zinc-700 px-2.5 py-[3px] rounded font-bold text-white/90 text-[12px] leading-none">
                  {cert}
                </span>
              </div>

              {/* Seasons List Container */}
              <div className="flex flex-col gap-1 mt-8 overflow-y-auto overflow-x-hidden no-scrollbar px-1 py-3 flex-1 pb-32">
                {(seasons as number[]).map((s: number, idx: number) => {
                  const seasonNum = s;
                  const isSeasonFocused = zone === 101 && item === idx + 1;
                  const isSeasonSelected = activeSeasonIndex === idx;
                  const seasonEpisodes = movie.episodes.filter((ep: any) => (ep.season_number ?? 1) === seasonNum);
                  return (
                    <SeasonRow
                      key={seasonNum}
                      seasonNum={seasonNum}
                      isFocused={isSeasonFocused}
                      isSelected={isSeasonSelected}
                      episodesCount={seasonEpisodes.length}
                      onClick={() => {
                        setFocus(101, idx + 1);
                        setActiveSeasonIndex(idx);
                      }}
                      onMouseEnter={() => {
                        setFocus(101, idx + 1, 'mouse');
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Right Column: Episodes scroll list */}
            <div
              className="w-[65%] h-full overflow-y-auto pl-10 pb-32 pt-24 scroll-smooth no-scrollbar"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeSeason as number}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex flex-col gap-8"
                >
                  {activeEpisodes.map((ep: any, idx: number) => {
                    const isEpisodeFocused = zone === 102 && item === idx;
                    return (
                      <EpisodeCard
                        key={ep._id || idx}
                        episode={ep}
                        index={idx}
                        isFocused={isEpisodeFocused}
                        backdropUrl={backdropUrl}
                        onClick={() => {
                          setFocus(102, idx);
                          onPlay(movie, ep.season_number ?? 1, ep.episode_number ?? 1);
                        }}
                        onMouseEnter={() => setFocus(102, idx, 'mouse')}
                      />
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mute / Unmute button in the bottom right corner ── */}
      {!isEpisodesView && (
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
      )}
    </div>
  );
}

interface EpisodeCardProps {
  episode: any;
  index: number;
  isFocused: boolean;
  backdropUrl: string | null;
  onClick: () => void;
  onMouseEnter: () => void;
}

function EpisodeCard({ episode, index, isFocused, backdropUrl, onClick, onMouseEnter }: EpisodeCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && cardRef.current) {
      cardRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isFocused]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex items-start gap-6 p-5 rounded-2xl cursor-pointer transition-all duration-200 ${
        isFocused ? 'bg-white/10' : 'hover:bg-white/5'
      }`}
    >
      {/* Thumbnail */}
      <div
        className={`relative w-80 aspect-video rounded-xl overflow-hidden flex-shrink-0 transition-transform duration-200 ${
          isFocused ? 'scale-[1.03] shadow-2xl' : ''
        }`}
        style={{
          border: isFocused ? '3px solid white' : '1px solid rgba(255, 255, 255, 0.15)',
        }}
      >
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt={episode.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-white/30 text-base font-semibold">
            No Image
          </div>
        )}
        {/* Vignette Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-transparent opacity-90 pointer-events-none" />
        {/* Episode X indicator overlay */}
        <div className="absolute bottom-3 left-4 text-sm font-bold text-white tracking-wide drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          Episode {episode.episode_number ?? (index + 1)}
        </div>
      </div>

      {/* Episode Details */}
      <div className="flex flex-col gap-2 pt-1 text-left">
        <h3 className="text-2xl font-bold text-white tracking-tight">
          {episode.name || `Episode ${episode.episode_number ?? (index + 1)}`}
        </h3>
        <p
          className="text-base text-white/70 leading-relaxed font-light"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {episode.overview || 'No description available.'}
        </p>
        {episode.duration && (
          <span className="text-base text-white/50 font-normal">
            ({episode.duration})
          </span>
        )}
      </div>
    </div>
  );
}

interface SeasonRowProps {
  seasonNum: number;
  isFocused: boolean;
  isSelected: boolean;
  episodesCount: number;
  onClick: () => void;
  onMouseEnter: () => void;
}

function SeasonRow({
  seasonNum,
  isFocused,
  isSelected,
  episodesCount,
  onClick,
  onMouseEnter,
}: SeasonRowProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isFocused && wrapperRef.current) {
      wrapperRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isFocused]);

  return (
    <div ref={wrapperRef} className="py-1 px-1">
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        className={`flex items-center justify-between px-6 py-4.5 rounded-xl cursor-pointer transition-all duration-200 select-none ${
          isFocused
            ? 'bg-white/20 text-white scale-[1.02]'
            : isSelected
            ? 'bg-white/10 text-white'
            : 'text-white/60 hover:text-white hover:bg-white/5'
        }`}
        style={{
          outline: isFocused ? '2px solid white' : 'none',
          outlineOffset: '2px',
        }}
      >
        <span className="font-bold text-lg">Season {seasonNum}</span>
        <span className="text-base opacity-80">{episodesCount} episodes</span>
      </div>
    </div>
  );
}
