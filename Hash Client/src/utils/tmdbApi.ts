const TMDB_API_KEY = '21ba63e7c55696df8b5f67b5e0c97a0f'; // TMDB v3 API key
const TMDB_BASE = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p';

export interface TMDBMovie {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  media_type?: 'movie' | 'tv';
  genre_ids?: number[];
  popularity: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBSearchResponse {
  results: TMDBMovie[];
  total_results: number;
  total_pages: number;
  page: number;
}

export interface TMDBMovieDetails extends TMDBMovie {
  runtime?: number;
  number_of_seasons?: number;
  number_of_episodes?: number;
  seasons?: any[];
  credits?: any;
  videos?: any;
  similar?: { results: TMDBMovie[] };
  recommendations?: { results: TMDBMovie[] };
  images?: any;
}

const fetchFromTMDB = async (endpoint: string, params: Record<string, string> = {}): Promise<any> => {
  const url = new URL(`${TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', TMDB_API_KEY);
  url.searchParams.set('language', 'en-US');
  
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`TMDB API error: ${response.status}`);
  }
  return response.json();
};

export const searchMovies = async (query: string, page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/search/multi', {
    query,
    page: String(page),
    include_adult: 'false',
  });
};

export const searchMoviesOnly = async (query: string, page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/search/movie', {
    query,
    page: String(page),
    include_adult: 'false',
  });
};

export const searchTVShows = async (query: string, page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/search/tv', {
    query,
    page: String(page),
    include_adult: 'false',
  });
};

export const getMovieDetails = async (id: number): Promise<TMDBMovieDetails> => {
  return fetchFromTMDB(`/movie/${id}`, {
    append_to_response: 'credits,videos,similar,recommendations,images',
  });
};

export const getTVDetails = async (id: number): Promise<TMDBMovieDetails> => {
  return fetchFromTMDB(`/tv/${id}`, {
    append_to_response: 'credits,videos,similar,recommendations,images',
  });
};

export const getMovieDetailsWithType = async (id: number, type: string): Promise<TMDBMovieDetails> => {
  if (type === 'tv') {
    return getTVDetails(id);
  }
  return getMovieDetails(id);
};

export const getTrending = async (mediaType: 'all' | 'movie' | 'tv' = 'all', timeWindow: 'day' | 'week' = 'week'): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB(`/trending/${mediaType}/${timeWindow}`);
};

export const getPopularMovies = async (page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/movie/popular', { page: String(page) });
};

export const getPopularTVShows = async (page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/tv/popular', { page: String(page) });
};

export const getTopRatedMovies = async (page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/movie/top_rated', { page: String(page) });
};

export const getTopRatedTVShows = async (page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/tv/top_rated', { page: String(page) });
};

export const getMovieGenres = async (): Promise<TMDBGenre[]> => {
  const data = await fetchFromTMDB('/genre/movie/list');
  return data.genres || [];
};

export const getTVGenres = async (): Promise<TMDBGenre[]> => {
  const data = await fetchFromTMDB('/genre/tv/list');
  return data.genres || [];
};

export const discoverMoviesByGenre = async (genreId: number, page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/discover/movie', {
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc',
  });
};

export const discoverTVByGenre = async (genreId: number, page = 1): Promise<TMDBSearchResponse> => {
  return fetchFromTMDB('/discover/tv', {
    with_genres: String(genreId),
    page: String(page),
    sort_by: 'popularity.desc',
  });
};

export const getPosterUrl = (posterPath: string | null, size: string = 'w342'): string | null => {
  if (!posterPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${posterPath}`;
};

export const getBackdropUrl = (backdropPath: string | null, size: string = 'w1280'): string | null => {
  if (!backdropPath) return null;
  return `${TMDB_IMAGE_BASE}/${size}${backdropPath}`;
};

export const getMovieTitle = (movie: TMDBMovie): string => {
  return movie.title || movie.name || 'Unknown Title';
};

export const getMovieYear = (movie: TMDBMovie): string => {
  const date = movie.release_date || movie.first_air_date;
  if (!date) return '';
  return String(new Date(date).getFullYear());
};

export const formatRuntime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
};
