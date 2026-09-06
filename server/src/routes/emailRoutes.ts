import { Router } from 'express';
import { resolveDevUser } from '../middleware/auth';
import { validateRequestBody } from '../middleware/validate';
import { scheduleEmailSchema } from '../utils/validation/emailValidation';
import { scheduleEmail, searchEmails } from '../controllers/emailController';

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

export default router;
