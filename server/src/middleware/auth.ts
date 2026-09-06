import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../utils/prisma';
import { config } from '../config';
import { User } from '@prisma/client';

let cachedDevUser: User | null = null;

/**
 * TEMPORARY Development Authentication Middleware.
 * Uses an idempotent Prisma upsert for config.DEV_USER_ID.
 * Isolated to easily replace with real Google OAuth authentication in future phases.
 */
export const resolveDevUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    if (!cachedDevUser) {
      const prisma = getPrismaClient();
      cachedDevUser = await prisma.user.upsert({
        where: { id: config.DEV_USER_ID },
        update: {},
        create: {
          id: config.DEV_USER_ID,
          googleId: `google-dev-${config.DEV_USER_ID}`,
          email: `${config.DEV_USER_ID}@reachinbox.ai`,
          name: 'Development User',
        },
      });
    }

    req.user = cachedDevUser;
    next();
  } catch (error) {
    console.error('[DevAuthMiddleware] Error resolving development user:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve development authentication user context',
    });
  }
};

/**
 * Helper to clear cached dev user if needed during testing.
 */
export const clearDevUserCache = (): void => {
  cachedDevUser = null;
};
