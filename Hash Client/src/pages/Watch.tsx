import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { CustomVideoPlayer } from '../components/home/CustomVideoPlayer';

const API = 'http://localhost:5001/api';

export function Watch() {
  const { tmdbId, season, episode, type } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [movie, setMovie] = useState<any>(location.state?.movie || null);
  const [loading, setLoading] = useState(!movie);

  useEffect(() => {
    if (movie) return;

    const fetchMovie = async () => {
      try {
        const response = await fetch(`${API}/movies/details/${tmdbId}?type=${type}`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await response.json();
        if (data.success) {
          setMovie(data.movie);
        } else {
          navigate('/home', { replace: true });
        }
      } catch (err) {
        console.error('Failed to fetch movie details for playback:', err);
        navigate('/home', { replace: true });
      } finally {
        setLoading(false);
      }
    };

    fetchMovie();
  }, [tmdbId, type, movie, navigate]);

  const handleClose = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  }, [navigate]);

  const handlePlayNextEpisode = useCallback((m: any, nextSeason: number, nextEpisode: number) => {
    navigate(`/watch/tv/${m.id || m._id}/${nextSeason}/${nextEpisode}`, { 
      state: { movie: m },
      replace: true 
    });
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="loading loading-spinner loading-lg text-red-600"></span>
      </div>
    );
  }

  if (!movie) return null;

  return (
    <CustomVideoPlayer
      movie={movie}
      season={season ? parseInt(season) : undefined}
      episode={episode ? parseInt(episode) : undefined}
      onClose={handleClose}
      onPlayNextEpisode={handlePlayNextEpisode}
    />
  );
}
