import Movie from '../models/Movie.js';
import Show from '../models/Show.js';
import User from '../models/User.js';
import UserFeed from '../models/UserFeed.js';

function buildCinebySearchQuery({ title, type, year, season, episode, imdbId, tmdbId }) {
    const parts = ['site:cineby.vg/watch/', 'cineby'];
    if (title) parts.push(`"${title}"`);
    if (year) parts.push(String(year));
    if (type === 'show') {
        if (season !== undefined && season !== null) parts.push(`season ${season}`);
        if (episode !== undefined && episode !== null) parts.push(`episode ${episode}`);
    }
    if (imdbId) parts.push(String(imdbId));
    if (tmdbId) parts.push(String(tmdbId));
    return parts.join(' ');
}

function normalizeCinebyUrl(rawUrl, season, episode) {
    try {
        const url = new URL(rawUrl);
        if (!url.hostname.endsWith('cineby.vg')) return null;
        if (!url.pathname.startsWith('/watch/')) return null;

        if (season !== undefined && season !== null && !url.searchParams.has('s')) {
            url.searchParams.set('s', String(season));
        }
        if (episode !== undefined && episode !== null && !url.searchParams.has('e')) {
            url.searchParams.set('e', String(episode));
        }
        return url.toString();
    } catch {
        return null;
    }
}

export const resolveCinebyWatchUrl = async (req, res) => {
    const {
        title,
        type = 'movie',
        year,
        season,
        episode,
        imdbId,
        tmdbId,
    } = req.query;

    if (!title && !imdbId && !tmdbId) {
        return res.status(400).json({ success: false, message: 'Missing title or id for Cineby lookup' });
    }

    const searchQuery = buildCinebySearchQuery({
        title: title ? String(title) : '',
        type: String(type),
        year,
        season,
        episode,
        imdbId,
        tmdbId,
    });

    try {
        const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}`;
        const response = await fetch(searchUrl, {
            headers: {
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
                accept: 'text/html,application/xhtml+xml',
            },
        });

        if (!response.ok) {
            return res.status(502).json({ success: false, message: 'Failed to search Cineby' });
        }

        const html = await response.text();
        const candidates = new Set();

        for (const match of html.matchAll(/uddg=([^&"']+)/g)) {
            try {
                candidates.add(decodeURIComponent(match[1]));
            } catch {
                // ignore malformed result URLs
            }
        }

        for (const match of html.matchAll(/https:\/\/cineby\.vg\/watch\/[^\s"'<>]+/g)) {
            candidates.add(match[0]);
        }

        const normalized = Array.from(candidates)
            .map((candidate) => normalizeCinebyUrl(candidate, season, episode))
            .filter(Boolean);

        const chosen = normalized.find((candidate) => candidate.includes('cineby.vg/watch/')) || null;

        res.status(200).json({
            success: true,
            searchQuery,
            url: chosen,
        });
    } catch (error) {
        console.error('Error resolving Cineby watch URL:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/search?q=<query>
export const searchMovies = async (req, res) => {
    const { q } = req.query;
    try {
        let query = {};
        if (q) {
            const regex = new RegExp(q, 'i');
            query = {
                $or: [
                    { rt_title: regex },
                    { tmdb_title: regex },
                    { original_title: regex }
                ]
            };
        }

        const [movies, shows] = await Promise.all([
            Movie.find(query).limit(25).lean(),
            Show.find(query).limit(25).lean()
        ]);

        const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
        const showsWithType = shows.map(s => ({ ...s, type: 'show' }));
        const combined = [...moviesWithType, ...showsWithType];

        res.status(200).json({ success: true, count: combined.length, movies: combined });
    } catch (error) {
        console.error('Error searching movies/shows:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/:id
export const getMovieById = async (req, res) => {
    const { id } = req.params;
    const movieId = parseInt(id, 10);
    if (isNaN(movieId)) {
        return res.status(400).json({ success: false, message: 'Invalid movie/show ID format' });
    }

    try {
        let item = await Movie.findOne({ _id: movieId });
        let type = 'movie';
        if (!item) {
            item = await Show.findOne({ _id: movieId });
            type = 'show';
        }
        if (!item) {
            return res.status(404).json({ success: false, message: 'Movie or Show not found' });
        }

        // Helper function to resolve similar and recommended items to full cards
        const resolveList = async (list) => {
            if (!list || !list.length) return [];
            const ids = list.map(item => item.id);
            const [resolvedMovies, resolvedShows] = await Promise.all([
                Movie.find({ _id: { $in: ids } })
                    .select('_id tmdb_title rt_title original_title images.posters popularity_score user_rating').lean(),
                Show.find({ _id: { $in: ids } })
                    .select('_id tmdb_title rt_title original_title images.posters popularity_score user_rating').lean()
            ]);
            
            const resolved = [
                ...resolvedMovies.map(m => ({ ...m, type: 'movie' })),
                ...resolvedShows.map(s => ({ ...s, type: 'show' }))
            ];
            
            return list.map(item => {
                const found = resolved.find(r => r._id === item.id);
                if (found) {
                    return {
                        _id: found._id,
                        type: found.type,
                        title: found.tmdb_title || found.rt_title || found.original_title,
                        poster_path: found.images?.posters?.[0]?.file_path || null,
                        user_rating: found.user_rating,
                        popularity_score: found.popularity_score
                    };
                }
                return item;
            });
        };

        const resolvedSimilar = await resolveList(item.similar_movies);
        const resolvedRecommendations = await resolveList(item.recommendations);

        const itemObj = item.toObject();
        itemObj.type = type;
        itemObj.similar_movies = resolvedSimilar;
        itemObj.recommendations = resolvedRecommendations;

        res.status(200).json({ success: true, movie: itemObj });
    } catch (error) {
        console.error('Error fetching movie/show details:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/trending
export const getTrendingMovies = async (req, res) => {
    try {
        const [movies, shows] = await Promise.all([
            Movie.find().sort({ popularity_score: -1 }).limit(20).lean(),
            Show.find().sort({ popularity_score: -1 }).limit(20).lean()
        ]);

        const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
        const showsWithType = shows.map(s => ({ ...s, type: 'show' }));
        const combined = [...moviesWithType, ...showsWithType]
            .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
            .slice(0, 20);

        res.status(200).json({ success: true, count: combined.length, movies: combined });
    } catch (error) {
        console.error('Error fetching trending movies/shows:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/popular
export const getPopularMovies = async (req, res) => {
    try {
        const [movies, shows] = await Promise.all([
            Movie.find({ vote_count: { $gte: 100 } })
                .sort({ user_rating: -1, popularity_score: -1 }).limit(20).lean(),
            Show.find({ vote_count: { $gte: 100 } })
                .sort({ user_rating: -1, popularity_score: -1 }).limit(20).lean()
        ]);

        const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
        const showsWithType = shows.map(s => ({ ...s, type: 'show' }));
        const combined = [...moviesWithType, ...showsWithType]
            .sort((a, b) => {
                if (b.user_rating !== a.user_rating) {
                    return (b.user_rating || 0) - (a.user_rating || 0);
                }
                return (b.popularity_score || 0) - (a.popularity_score || 0);
            })
            .slice(0, 20);

        res.status(200).json({ success: true, count: combined.length, movies: combined });
    } catch (error) {
        console.error('Error fetching popular movies/shows:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/new
export const getNewMovies = async (req, res) => {
    try {
        const [movies, shows] = await Promise.all([
            Movie.find({ release_date: { $exists: true, $ne: null, $ne: '' } })
                .sort({ release_date: -1 }).limit(20).lean(),
            Show.find({ release_date: { $exists: true, $ne: null, $ne: '' } })
                .sort({ release_date: -1 }).limit(20).lean()
        ]);

        const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
        const showsWithType = shows.map(s => ({ ...s, type: 'show' }));
        const combined = [...moviesWithType, ...showsWithType]
            .sort((a, b) => new Date(b.release_date).getTime() - new Date(a.release_date).getTime())
            .slice(0, 20);

        res.status(200).json({ success: true, count: combined.length, movies: combined });
    } catch (error) {
        console.error('Error fetching new movies/shows:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/mylist
export const getMyList = async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const [movies, shows] = await Promise.all([
            Movie.find({ _id: { $in: user.myList } }).lean(),
            Show.find({ _id: { $in: user.myList } }).lean()
        ]);

        const moviesWithType = movies.map(m => ({ ...m, type: 'movie' }));
        const showsWithType = shows.map(s => ({ ...s, type: 'show' }));
        const combined = [...moviesWithType, ...showsWithType];

        res.status(200).json({ success: true, count: combined.length, movies: combined });
    } catch (error) {
        console.error('Error fetching watchlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// POST /api/movies/mylist
export const addToMyList = async (req, res) => {
    const { movieId } = req.body;
    const numericId = parseInt(movieId, 10);
    if (isNaN(numericId)) {
        return res.status(400).json({ success: false, message: 'Invalid movie/show ID format' });
    }

    try {
        const movieExists = await Movie.exists({ _id: numericId });
        const showExists = !movieExists ? await Show.exists({ _id: numericId }) : false;
        if (!movieExists && !showExists) {
            return res.status(404).json({ success: false, message: 'Movie/Show not found' });
        }

        await User.findByIdAndUpdate(req.userId, {
            $addToSet: { myList: numericId }
        });

        res.status(200).json({ success: true, message: 'Added to your watchlist' });
    } catch (error) {
        console.error('Error adding to watchlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// DELETE /api/movies/mylist/:movieId
export const removeFromMyList = async (req, res) => {
    const { movieId } = req.params;
    const numericId = parseInt(movieId, 10);
    if (isNaN(numericId)) {
        return res.status(400).json({ success: false, message: 'Invalid movie/show ID format' });
    }

    try {
        await User.findByIdAndUpdate(req.userId, {
            $pull: { myList: numericId }
        });

        res.status(200).json({ success: true, message: 'Removed from your watchlist' });
    } catch (error) {
        console.error('Error removing from watchlist:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// GET /api/movies/feed
export const getUserFeed = async (req, res) => {
    try {
        const feedDoc = await UserFeed.findOne({ userId: req.userId }).lean();
        if (!feedDoc) {
            return res.status(404).json({ success: false, message: 'User feed not found' });
        }

        // Collect all unique IDs to load in bulk
        const ids = new Set();
        if (feedDoc.heroHome) ids.add(feedDoc.heroHome);
        if (feedDoc.heroMovies) ids.add(feedDoc.heroMovies);
        if (feedDoc.heroShows) ids.add(feedDoc.heroShows);

        const addRowIds = (tabData) => {
            if (!tabData) return;
            for (const key of Object.keys(tabData)) {
                const rowIds = tabData[key];
                if (Array.isArray(rowIds)) {
                    rowIds.forEach(id => {
                        const num = Number(id);
                        if (!isNaN(num)) ids.add(num);
                    });
                }
            }
        };

        addRowIds(feedDoc.home);
        addRowIds(feedDoc.movies);
        addRowIds(feedDoc.shows);

        const idList = Array.from(ids);

        // Fetch movie and show details in parallel
        const [movies, shows] = await Promise.all([
            Movie.find({ _id: { $in: idList } }).lean(),
            Show.find({ _id: { $in: idList } }).lean()
        ]);

        // Create a fast lookup map
        const movieMap = new Map();
        movies.forEach(m => movieMap.set(m._id, { ...m, type: 'movie' }));
        shows.forEach(s => movieMap.set(s._id, { ...s, type: 'show' }));

        const hydrateHero = (id) => {
            if (!id) return null;
            return movieMap.get(Number(id)) || null;
        };

        const hydrateTab = (tabData) => {
            if (!tabData) return {};
            const hydrated = {};
            for (const key of Object.keys(tabData)) {
                const rowIds = tabData[key];
                if (Array.isArray(rowIds)) {
                    hydrated[key] = rowIds
                        .map(id => movieMap.get(Number(id)))
                        .filter(Boolean); // Filter out any missing movies/shows
                } else {
                    hydrated[key] = [];
                }
            }
            return hydrated;
        };

        const responseFeed = {
            _id: feedDoc._id,
            userId: feedDoc.userId,
            username: feedDoc.username,
            heroHome: hydrateHero(feedDoc.heroHome),
            heroMovies: hydrateHero(feedDoc.heroMovies),
            heroShows: hydrateHero(feedDoc.heroShows),
            home: hydrateTab(feedDoc.home),
            movies: hydrateTab(feedDoc.movies),
            shows: hydrateTab(feedDoc.shows)
        };

        res.status(200).json({ success: true, feed: responseFeed });
    } catch (error) {
        console.error('Error fetching/hydrating user feed:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
