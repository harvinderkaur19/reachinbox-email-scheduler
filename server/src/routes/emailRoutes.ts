import { Router } from 'express';
import { authenticateUser } from '../middleware/auth';
import { validateRequestBody } from '../middleware/validate';
import { scheduleEmailSchema } from '../utils/validation/emailValidation';
import {
  scheduleEmail,
  updateScheduledEmail,
  getEmailById,
  searchEmails,
  getScheduledEmails,
  getSentEmails,
} from '../controllers/emailController';

const router = Router();

// POST /api/emails/schedule
router.post(
  '/schedule',
  authenticateUser,
  validateRequestBody(scheduleEmailSchema),
  scheduleEmail
);

// GET /api/emails/:id
router.get(
  '/:id',
  authenticateUser,
  getEmailById
);

// PUT /api/emails/:id
router.put(
  '/:id',
  authenticateUser,
  updateScheduledEmail
);

// GET /api/emails/search?q=<query>
router.get(
  '/search',
  authenticateUser,
  searchEmails
);

// GET /api/emails/scheduled?page=1&limit=20
router.get(
  '/scheduled',
  authenticateUser,
  getScheduledEmails
);

// GET /api/emails/sent?page=1&limit=20
router.get(
  '/sent',
  authenticateUser,
  getSentEmails
);

export default router;

