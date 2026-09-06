import { Request, Response } from 'express';
import { config } from '../config';
import { getPrismaClient } from '../utils/prisma';
import {
  generateOAuthState,
  validateOAuthState,
  getGoogleAuthUrl,
  exchangeCodeForTokens,
  fetchGoogleUserProfile,
  upsertGoogleUser,
} from '../services/authService';
import {
  createSession,
  destroySession,
  createHandoffToken,
  exchangeHandoffToken,
} from '../utils/session';

/**
 * GET /api/auth/google
 * Initiates Google OAuth 2.0 authorization flow.
 */
export const googleAuthStart = async (_req: Request, res: Response): Promise<void> => {
  try {
    const state = await generateOAuthState();
    const googleAuthUrl = getGoogleAuthUrl(state);
    res.redirect(googleAuthUrl);
  } catch (error) {
    console.error('⚠️ [AuthController] Error starting Google OAuth:', (error as Error).message);
    res.redirect(`${config.CLIENT_URL}/?error=oauth_init_failed`);
  }
};

/**
 * GET /api/auth/google/callback
 * Handles Google OAuth callback, validates state, exchanges tokens, upserts user, establishes session,
 * and generates a one-time auth handoff token for secure frontend session handoff.
 */
export const googleAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error: googleError } = req.query;

    if (googleError) {
      console.warn('⚠️ [AuthController] Google OAuth access denied:', googleError);
      res.redirect(`${config.CLIENT_URL}/?error=oauth_access_denied`);
      return;
    }

    if (!code || typeof code !== 'string' || !state || typeof state !== 'string') {
      res.redirect(`${config.CLIENT_URL}/?error=invalid_oauth_params`);
      return;
    }

    // Atomically validate & consume state token
    const isValidState = await validateOAuthState(state);
    if (!isValidState) {
      console.warn('⚠️ [AuthController] Invalid or expired OAuth state token');
      res.redirect(`${config.CLIENT_URL}/?error=invalid_oauth_state`);
      return;
    }

    // Token exchange & user profile retrieval
    const { access_token } = await exchangeCodeForTokens(code);
    const googleProfile = await fetchGoogleUserProfile(access_token);

    // Deterministic user upsert in Prisma MySQL
    const user = await upsertGoogleUser(googleProfile);
    console.log(`[AuthController] Google profile verified and user record upserted successfully for user: ${user.email}`);

    // Create Redis-backed opaque session & set HTTP-only cookie
    const sessionId = await createSession(res, user.id);
    console.log(`[AuthController] Session established in Redis and Set-Cookie header set.`);

    // Generate a secure one-time handoff token (60s TTL, single use)
    const handoffToken = await createHandoffToken(sessionId, user.id);

    const redirectUrl = `${config.CLIENT_URL}/auth/callback?token=${handoffToken}`;
    console.log(`[AuthController] Redirecting browser to frontend callback with handoff token: ${config.CLIENT_URL}/auth/callback?token=...`);

    // Redirect browser to frontend callback page
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('⚠️ [AuthController] Error in Google OAuth callback:', (error as Error).message);
    res.redirect(`${config.CLIENT_URL}/?error=auth_failed`);
  }
};

/**
 * POST /api/auth/exchange
 * Exchanges a one-time handoff token for an authenticated session token.
 */
export const exchangeHandoffTokenHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.body || {};

    if (!token || typeof token !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Handoff token is required',
      });
      return;
    }

    const result = await exchangeHandoffToken(token);
    if (!result) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired handoff token',
      });
      return;
    }

    console.log(`[AuthController] Handoff token exchanged successfully for userId: ${result.userId}`);

    res.status(200).json({
      success: true,
      data: {
        sessionToken: result.sessionId,
        userId: result.userId,
      },
    });
  } catch (error) {
    console.error('⚠️ [AuthController] Error exchanging handoff token:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to exchange handoff token',
    });
  }
};

/**
 * GET /api/auth/me
 * Returns authenticated user profile details and active sender accounts (Read-Only).
 */
export const getCurrentUser = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    console.log('[AuthController] GET /api/auth/me called without authenticated req.user context');
    res.status(401).json({
      success: false,
      error: 'Unauthenticated',
    });
    return;
  }

  console.log(`[Session] Authenticated user returned: ${req.user.email}`);

  const prisma = getPrismaClient();
  const senderAccounts = await prisma.senderAccount.findMany({
    where: { userId: req.user.id, isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      user: {
        id: req.user.id,
        googleId: req.user.googleId,
        name: req.user.name,
        email: req.user.email,
        avatarUrl: req.user.avatarUrl,
        senderAccounts,
      },
    },
  });
};

/**
 * POST /api/auth/logout
 * Destroys session in Redis and clears HTTP-only cookie.
 */
export const logoutUser = async (req: Request, res: Response): Promise<void> => {
  try {
    await destroySession(req, res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('⚠️ [AuthController] Error during logout:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to complete logout',
    });
  }
};

