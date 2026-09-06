import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';

const app: Express = express();

// Middleware
app.use(cors({ origin: config.CLIENT_URL }));
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'reachinbox-email-scheduler-server',
    timestamp: new Date().toISOString(),
  });
});

export default app;
