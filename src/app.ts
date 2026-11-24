import express from 'express';
import cors from 'cors';
import chatRoutes from './routes/chatRoutes';
import userRoutes from './routes/userRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/chat', chatRoutes);
app.use('/user', userRoutes);

export default app;
