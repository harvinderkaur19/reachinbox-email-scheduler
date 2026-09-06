import { Router } from 'express';
import { resolveDevUser } from '../middleware/auth';
import { validateRequestBody } from '../middleware/validate';
import { scheduleEmailSchema } from '../utils/validation/emailValidation';
import { scheduleEmail } from '../controllers/emailController';

const router = Router();

// POST /api/emails/schedule
router.post(
  '/schedule',
  resolveDevUser,
  validateRequestBody(scheduleEmailSchema),
  scheduleEmail
);

export default router;
