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

// 1. Static GET & Action Endpoints (MUST BE DEFINED BEFORE /:id)
router.post(
  '/schedule',
  authenticateUser,
  validateRequestBody(scheduleEmailSchema),
  scheduleEmail
);

router.get(
  '/scheduled',
  authenticateUser,
  getScheduledEmails
);

router.get(
  '/sent',
  authenticateUser,
  getSentEmails
);

router.get(
  '/search',
  authenticateUser,
  searchEmails
);

// 2. Dynamic parameterized endpoints (MUST BE DEFINED AFTER ALL STATIC ROUTES)
router.get(
  '/:id',
  authenticateUser,
  getEmailById
);

router.put(
  '/:id',
  authenticateUser,
  updateScheduledEmail
);

export default router;

