import mongoose from 'mongoose';

const userFeedSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true
    },
    username: {
        type: String,
        required: true
    },
    home: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    movies: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    shows: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    heroHome: {
        type: Number
    },
    heroMovies: {
        type: Number
    },
    heroShows: {
        type: Number
    },
    feed: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    hero: {
        type: Number
    }
}, { collection: 'User-Feed', timestamps: true });

const UserFeed = mongoose.model('UserFeed', userFeedSchema);

export default UserFeed;
