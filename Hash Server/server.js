import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cookieParser from 'cookie-parser';

import router from './routes/authApi.js';
import movieRouter from './routes/movieRoutes.js';
import cors from 'cors';
import { connectDB } from './configs/mongodb.js';

const app = express();
app.use(cookieParser());

app.use(cors({
  origin:"http://localhost:5173",
  credentials: true,
}));

app.use(express.json());

const PORT = process.env.PORT || 5001;

app.use('/api/auth', router);
app.use('/api/movies', movieRouter);

connectDB(process.env.MONGO_URI).then(() => {
    app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`);
    });

    
})



