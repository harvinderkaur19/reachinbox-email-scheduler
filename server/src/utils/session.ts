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
 * Retrieves the session payload from Redis using the sid cookie from the request header.
 */
export const getSession = async (cookieHeader?: string): Promise<{ userId: string } | null> => {
  const hasCookieHeader = Boolean(cookieHeader);
  const cookies = parseCookies(cookieHeader);
  const hasSid = Boolean(cookies.sid);

  if (!hasSid) {
    if (!hasCookieHeader) {
      console.log('[Session] getSession check: Request contains no Cookie header');
    } else {
      console.log('[Session] getSession check: Cookie header present, but "sid" cookie missing');
    }
    return null;
  }

  const redis = getRedisClient();
  const rawSession = await redis.get(`session:${cookies.sid}`);
  if (!rawSession) {
    console.log('[Session] getSession check: "sid" cookie present, but session key not found in Redis (expired or invalid)');
    return null;
  }

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
 * Destroys the active session in Redis and clears the sid cookie on the response.
 */
export const destroySession = async (req: Request, res: Response): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sid;

  if (sessionId) {
    const redis = getRedisClient();
    await redis.del(`session:${sessionId}`);
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
