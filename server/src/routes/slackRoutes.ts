import { Router } from 'express';
import { resolveDevUser } from '../middleware/auth';
import {
  startOAuth,
  handleOAuthCallback,
  disconnect,
  getStatus,
} from '../controllers/slackController';

const router = Router();

// OAuth flow start & callback routes
router.get('/oauth/start', resolveDevUser, startOAuth);
router.get('/oauth/callback', handleOAuthCallback);

// Management routes
router.post('/disconnect', resolveDevUser, disconnect);
router.get('/status', resolveDevUser, getStatus);

export default router;
