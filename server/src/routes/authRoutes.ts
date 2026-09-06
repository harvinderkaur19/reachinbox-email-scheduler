import { Router } from 'express';
import {
  googleAuthStart,
  googleAuthCallback,
  exchangeHandoffTokenHandler,
  getCurrentUser,
  logoutUser,
} from '../controllers/authController';
import { authenticateUser } from '../middleware/auth';

const router = Router();

// Public Google OAuth endpoints
router.get('/google', googleAuthStart);
router.get('/google/callback', googleAuthCallback);
router.post('/exchange', exchangeHandoffTokenHandler);

// Protected Auth endpoints
router.get('/me', authenticateUser, getCurrentUser);
router.post('/logout', logoutUser);

export default router;

