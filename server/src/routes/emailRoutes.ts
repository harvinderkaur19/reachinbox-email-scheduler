import { Router } from 'express';
import { resolveDevUser } from '../middleware/auth';
import { validateRequestBody } from '../middleware/validate';
import { scheduleEmailSchema } from '../utils/validation/emailValidation';
import {
  scheduleEmail,
  searchEmails,
  getScheduledEmails,
  getSentEmails,
} from '../controllers/emailController';

const router = Router();

// POST /api/emails/schedule
router.post(
  '/schedule',
  resolveDevUser,
  validateRequestBody(scheduleEmailSchema),
  scheduleEmail
);

// GET /api/emails/search?q=<query>
router.get(
  '/search',
  resolveDevUser,
  searchEmails
);

// GET /api/emails/scheduled?page=1&limit=20
router.get(
  '/scheduled',
  resolveDevUser,
  getScheduledEmails
);

// GET /api/emails/sent?page=1&limit=20
router.get(
  '/sent',
  resolveDevUser,
  getSentEmails
);

export default router;
