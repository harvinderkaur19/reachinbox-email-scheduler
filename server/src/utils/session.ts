import { Request, Response } from 'express';
import crypto from 'crypto';
import { getRedisClient } from './redis';
import { config } from '../config';

const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

/**
 * Parses raw Cookie header string into a key-value dictionary.
 */
export const parseCookies = (cookieHeader?: string): Record<string, string> => {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;

  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const name = parts.shift()?.trim();
    if (name) {
      const value = parts.join('=').trim();
      list[name] = decodeURIComponent(value);
    }
  });

  return list;
};

/**
 * Helper to determine if cross-origin secure cookies (SameSite=None; Secure) are required.
 * Returns true if NODE_ENV is production OR if CLIENT_URL uses HTTPS / non-localhost origin.
 */
const isSecureCrossOrigin = (): boolean => {
  if (config.NODE_ENV === 'production') return true;
  if (!config.CLIENT_URL) return false;
  return config.CLIENT_URL.startsWith('https://') || !config.CLIENT_URL.includes('localhost');
};

/**
 * Creates an opaque session in Redis and sets an HTTP-only cookie on the response.
 */
export const createSession = async (res: Response, userId: string): Promise<string> => {
  const sessionId = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();

  const sessionData = JSON.stringify({
    userId,
    createdAt: new Date().toISOString(),
  });

  await redis.set(`session:${sessionId}`, sessionData, 'EX', SESSION_TTL_SECONDS);

  const useSecureCrossOrigin = isSecureCrossOrigin();
  const sameSiteMode = useSecureCrossOrigin ? 'SameSite=None' : 'SameSite=Lax';

  const cookieParts = [
    `sid=${sessionId}`,
    'Path=/',
    'HttpOnly',
    sameSiteMode,
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  if (useSecureCrossOrigin) {
    cookieParts.push('Secure');
    cookieParts.push('Partitioned'); // CHIPS support for cross-site third-party cookie persistence
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
  console.log(`[Session] Created session for user. CrossOrigin: ${useSecureCrossOrigin}, SameSite: ${sameSiteMode}, Partitioned: ${useSecureCrossOrigin}`);
  return sessionId;
};

/**
 * Retrieves the session payload from Redis using a direct session ID token string.
 */
export const getSessionFromToken = async (token?: string): Promise<{ userId: string } | null> => {
  if (!token || typeof token !== 'string') return null;
  const redis = getRedisClient();
  const rawSession = await redis.get(`session:${token}`);
  if (!rawSession) return null;

  try {
    const data = JSON.parse(rawSession);
    if (data && typeof data.userId === 'string') {
      return { userId: data.userId };
    }
  } catch (err) {
    console.error('⚠️ Failed to parse session JSON from Redis:', err);
  }

  return null;
};

/**
 * Retrieves the session payload from Redis using the sid cookie from the request header
 * or an optional fallback session token string (e.g. Authorization header or query token).
 */
export const getSession = async (
  cookieHeader?: string,
  tokenFallback?: string
): Promise<{ userId: string } | null> => {
  const hasCookieHeader = Boolean(cookieHeader);
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies.sid || tokenFallback;

  if (!sessionId) {
    if (!hasCookieHeader && !tokenFallback) {
      console.log('[Session] getSession check: Request contains no Cookie header and no session token fallback');
    } else {
      console.log('[Session] getSession check: Header/Cookie present, but "sid" session ID is missing');
    }
    return null;
  }

  const session = await getSessionFromToken(sessionId);
  if (!session) {
    console.log('[Session] getSession check: Session ID token present, but key not found in Redis (expired or invalid)');
    return null;
  }

  console.log(`[Session] getSession check: Valid session resolved for userId: ${session.userId}`);
  return session;
};

/**
 * Generates a cryptographically secure one-time authentication handoff token.
 * Token is stored in Redis for 60 seconds with single-use semantics.
 */
export const createHandoffToken = async (
  sessionId: string,
  userId: string
): Promise<string> => {
  const handoffToken = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();

  const payload = JSON.stringify({
    sessionId,
    userId,
    createdAt: new Date().toISOString(),
  });

  // Store handoff token in Redis with a strict 60-second TTL
  await redis.set(`handoff:${handoffToken}`, payload, 'EX', 60);

  console.log(`[HandoffToken] Created one-time handoff token for userId: ${userId}`);
  return handoffToken;
};

/**
 * Validates and atomically consumes a one-time handoff token from Redis.
 */
export const exchangeHandoffToken = async (
  token: string
): Promise<{ sessionId: string; userId: string } | null> => {
  if (!token || typeof token !== 'string') return null;

  const redis = getRedisClient();
  const rawData = await redis.get(`handoff:${token}`);

  if (!rawData) {
    console.log('[HandoffToken] Handoff token exchange failed: Token invalid or expired');
    return null;
  }

  // Immediately invalidate handoff token so it cannot be re-used
  await redis.del(`handoff:${token}`);

  try {
    const data = JSON.parse(rawData);
    if (data && typeof data.sessionId === 'string' && typeof data.userId === 'string') {
      console.log(`[HandoffToken] Exchanged one-time handoff token successfully for userId: ${data.userId}`);
      return { sessionId: data.sessionId, userId: data.userId };
    }
  } catch (err) {
    console.error('⚠️ [HandoffToken] Failed to parse handoff token JSON payload:', err);
  }

  return null;
};

/**
 * Destroys the active session in Redis and clears the sid cookie on the response.
 */
export const destroySession = async (req: Request, res: Response): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  const authHeader =
    req.headers.authorization ||
    (req.headers['x-session-token'] as string) ||
    (req.query.session_token as string);
  const tokenFallback = authHeader ? authHeader.replace(/^Bearer\s+/i, '').trim() : undefined;

  const sessionId = cookies.sid || tokenFallback;

  if (sessionId) {
    const redis = getRedisClient();
    await redis.del(`session:${sessionId}`);
    console.log('[Session] Redis session destroyed for session token');
  }

  const useSecureCrossOrigin = isSecureCrossOrigin();
  const sameSiteMode = useSecureCrossOrigin ? 'SameSite=None' : 'SameSite=Lax';

  const cookieParts = [
    'sid=',
    'Path=/',
    'HttpOnly',
    sameSiteMode,
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (useSecureCrossOrigin) {
    cookieParts.push('Secure');
    cookieParts.push('Partitioned');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
};
