import mongoose from 'mongoose';
import { getMoviesConnection } from '../configs/mongodb.js';

const showSchema = new mongoose.Schema({
    _id: {
        type: Number,
        required: true
    },
    rt_title: String,
    tmdb_title: String,
    original_title: String,
    overview: String,
    release_date: String,
    user_rating: Number,
    vote_count: Number,
    popularity_score: Number,
    logo_url: String,
    certification: String,
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
    crew: mongoose.Schema.Types.Mixed,
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
        logos: mongoose.Schema.Types.Mixed
    },
    videos: mongoose.Schema.Types.Mixed,
    similar_movies: mongoose.Schema.Types.Mixed,
    recommendations: mongoose.Schema.Types.Mixed,
    episodes: [
        {
            season_number: Number,
            episode_number: Number,
            name: String,
            overview: String,
            duration: String
        }
    ]
}, { collection: 'Shows', timestamps: true });

showSchema.index({
    rt_title: 'text',
    tmdb_title: 'text',
    original_title: 'text'
});

const Show = getMoviesConnection().model('Show', showSchema);

export default Show;
