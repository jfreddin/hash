import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play } from 'lucide-react';
import { getPosterUrl, getTitle, getTrailerKey, getTrailerEmbedUrl } from '../../utils/movieHelpers';

const TRAILER_DELAY = 5000;

interface MovieCardProps {
  movie: any;
  isFocused: boolean;
  onFocus: () => void; // called on mouse enter
  onClick: () => void;
  width?: number;
  height?: number;
}

export function MovieCard({
  movie,
  isFocused,
  onFocus,
  onClick,
  width = 150,
  height = 225,
}: MovieCardProps) {
  const [showTrailer, setShowTrailer] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const trailerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const posterUrl = getPosterUrl(movie);
  const title = getTitle(movie);
  const trailerKey = getTrailerKey(movie);

  // 5-second trailer timer
  useEffect(() => {
    if (isFocused && trailerKey) {
      trailerTimer.current = setTimeout(() => setShowTrailer(true), TRAILER_DELAY);
    } else {
      setShowTrailer(false);
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
    }
    return () => {
      if (trailerTimer.current) clearTimeout(trailerTimer.current);
    };
  }, [isFocused, trailerKey]);

  return (
    <motion.div
      className="relative shrink-0 rounded overflow-hidden cursor-pointer select-none"
      style={{ width, height }}
      onMouseEnter={onFocus}
      onClick={onClick}
      animate={{
        scale: isFocused ? 1.08 : 1,
        y: isFocused ? -6 : 0,
        zIndex: isFocused ? 10 : 1,
      }}
      transition={{ type: 'spring', stiffness: 260, damping: 22 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Poster image */}
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover"
          onLoad={() => setImageLoaded(true)}
          draggable={false}
        />
      ) : (
        /* Placeholder when no poster */
        <div
          className="w-full h-full flex items-center justify-center bg-zinc-800 text-zinc-500 text-xs text-center p-2"
        >
          {title}
        </div>
      )}

      {/* Loading shimmer */}
      {!imageLoaded && posterUrl && (
        <div className="absolute inset-0 bg-zinc-800 animate-pulse" />
      )}

      {/* Trailer iframe overlay */}
      <AnimatePresence>
        {showTrailer && trailerKey && (
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <iframe
              src={getTrailerEmbedUrl(trailerKey)}
              className="w-full h-full pointer-events-none"
              style={{ border: 'none' }}
              allow="accelerometer; autoplay; modestbranding; encrypted-media; gyroscope; picture-in-picture"
              title={`${title} trailer`}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Focus ring */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="absolute inset-0 rounded pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            style={{ boxShadow: 'inset 0 0 0 2.5px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.15)' }}
          />
        )}
      </AnimatePresence>

      {/* Play icon on focus hover */}
      <AnimatePresence>
        {isFocused && !showTrailer && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            <div className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center">
              <Play size={16} className="text-white ml-0.5" fill="white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Title label — shown on focus */}
      <AnimatePresence>
        {isFocused && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 px-2 py-2"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)' }}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <p className="text-white text-xs font-medium leading-tight line-clamp-2">{title}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
