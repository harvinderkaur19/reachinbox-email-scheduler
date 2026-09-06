import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config';
import emailRoutes from './routes/emailRoutes';
import slackRoutes from './routes/slackRoutes';
import authRoutes from './routes/authRoutes';

const app: Express = express();

// Trust Railway / cloud reverse proxy headers (X-Forwarded-Proto, X-Forwarded-For)
app.set('trust proxy', 1);

// CORS Middleware with credentials enabled for cross-origin session cookies
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const targetUrl = config.CLIENT_URL ? config.CLIENT_URL.replace(/\/+$/, '') : '';
      const incomingOrigin = origin.replace(/\/+$/, '');

      if (incomingOrigin === targetUrl || incomingOrigin.endsWith('.vercel.app')) {
        return callback(null, true);
      }

      callback(null, true);
    },
    credentials: true,
  })
);
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
