//mongodb://localhost:27017/

import mongoose from 'mongoose';

export const connectDB = async (connectionString) => {
    try {
        const usersUri = connectionString.replace(/\/admin(\?|$)/, '/Users$1');
        await mongoose.connect(usersUri, {});
        console.log('Connected to Users MongoDB');
    }
    catch (error) {
        console.error('Error connecting to Users MongoDB:', error);
        process.exit(1);
    }
};

let moviesConnection = null;

export const getMoviesConnection = () => {
    if (!moviesConnection) {
        const connectionString = process.env.MONGO_URI || 'mongodb://192.168.0.2:27017/admin';
        const moviesUri = connectionString.replace(/\/admin(\?|$)/, '/Movies$1');
        moviesConnection = mongoose.createConnection(moviesUri, {});
        console.log('Connected to Movies MongoDB');
    }
    return moviesConnection;
};

