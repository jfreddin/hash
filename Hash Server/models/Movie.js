import mongoose from 'mongoose';
import { getMoviesConnection } from '../configs/mongodb.js';

const movieSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true
    },
    rt_title: String,
    tmdb_title: String,
    original_title: String,
    overview: String, // Synopsis / description (optional — populated from TMDB imports)
    release_date: String,
    user_rating: Number,
    vote_count: Number,
    popularity_score: Number,
    cast: [
        {
            adult: Boolean,
            gender: Number,
            id: Number,
            known_for_department: String,
            name: String,
            original_name: String,
            popularity: Number,
            profile_path: String,
            cast_id: Number,
            character: String,
            credit_id: String,
            order: Number
        }
    ],
    crew: {
        directors: [String],
        composers: [String]
    },
    images: {
        posters: [
            {
                aspect_ratio: Number,
                height: Number,
                iso_3166_1: String,
                iso_639_1: String,
                file_path: String,
                vote_average: Number,
                vote_count: Number,
                width: Number
            }
        ],
        backdrops: [
            {
                aspect_ratio: Number,
                height: Number,
                iso_3166_1: String,
                iso_639_1: String,
                file_path: String,
                vote_average: Number,
                vote_count: Number,
                width: Number
            }
        ],
        logos: [
            {
                aspect_ratio: Number,
                height: Number,
                iso_3166_1: String,
                iso_639_1: String,
                file_path: String,
                vote_average: Number,
                vote_count: Number,
                width: Number
            }
        ]
    },
    videos: [
        {
            iso_639_1: String,
            iso_3166_1: String,
            name: String,
            key: String,
            site: String,
            size: Number,
            type: String,
            official: Boolean,
            id: String,
            published_at: String
        }
    ],
    certification: String,
    belongs_to_collection: mongoose.Schema.Types.Mixed,
    similar_movies: [
        {
            id: Number,
            title: String
        }
    ],
    recommendations: [
        {
            id: Number,
            title: String
        }
    ],
    logo_url: String,
    duration: String
}, { collection: 'Movies', timestamps: true });

// Define text index on title fields for efficient searching
movieSchema.index({
    rt_title: 'text',
    tmdb_title: 'text',
    original_title: 'text'
});

// Compile model on the movies connection
const Movie = getMoviesConnection().model('Movie', movieSchema);

export default Movie;
