import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import {
  startOAuth,
  handleOAuthCallback,
  disconnect,
  getStatus,
} from '../controllers/slackController';

const router = Router();

// OAuth flow start & callback routes (Publicly reachable)
router.get('/oauth/start', startOAuth);
router.get('/oauth/callback', handleOAuthCallback);

// Protected Slack application management endpoints
router.post('/disconnect', authenticateUser, disconnect);
router.get('/status', authenticateUser, getStatus);

export default router;
