import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import emailRoutes from './routes/emailRoutes';

const app: Express = express();

// Middleware
app.use(cors({ origin: config.CLIENT_URL }));
app.use(express.json());

// Routes
app.use('/api/emails', emailRoutes);

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'reachinbox-email-scheduler-server',
    timestamp: new Date().toISOString(),
  });
});

export default app;
