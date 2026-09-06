import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import authRoutes from './routes/authRoutes';

const app: Express = express();

// Middleware
app.use(cors({ origin: config.CLIENT_URL, credentials: true }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/slack', slackRoutes);

// Health & Root Status Endpoints
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'reachinbox-email-scheduler-server',
    message: 'ReachInbox Email Scheduler API is running',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    service: 'reachinbox-email-scheduler-server',
    timestamp: new Date().toISOString(),
  });
});

export default app;
