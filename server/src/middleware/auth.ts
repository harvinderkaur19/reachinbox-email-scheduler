import { Request, Response, NextFunction } from 'express';
import { getPrismaClient } from '../utils/prisma';
import { getSession } from '../utils/session';

/**
 * Authentication middleware for protected application routes.
 * Validates the HTTP-only sid session cookie in Redis and populates req.user.
 */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const session = await getSession(req.headers.cookie);
    if (!session) {
      res.status(401).json({
        success: false,
        error: 'Unauthenticated: Invalid or expired session',
      });
      return;
    }

    const prisma = getPrismaClient();
    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Unauthenticated: User profile not found',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('⚠️ [AuthMiddleware] Error during session authentication:', error);
    res.status(500).json({
      success: false,
      error: 'Internal authentication error',
    });
  }
};
