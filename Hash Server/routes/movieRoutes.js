import express from 'express';
import {
    searchMovies,
    getMovieById,
    getTrendingMovies,
    getPopularMovies,
    getNewMovies,
    getMyList,
    addToMyList,
    removeFromMyList,
    getUserFeed
} from '../controllers/movieControllers.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = express.Router();

// Apply auth middleware to protect all routes
router.use(verifyToken);

// Category and search endpoints
router.get('/search', searchMovies);
router.get('/trending', getTrendingMovies);
router.get('/popular', getPopularMovies);
router.get('/new', getNewMovies);

// Watchlist (myList) endpoints
router.get('/mylist', getMyList);
router.post('/mylist', addToMyList);
router.delete('/mylist/:movieId', removeFromMyList);

// User-Feed endpoints
router.get('/feed', getUserFeed);

// Detail lookup endpoint (must be last to avoid matching categories as IDs)
router.get('/:id', getMovieById);

export default router;
