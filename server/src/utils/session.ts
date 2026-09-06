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

  const isProduction = config.NODE_ENV === 'production';
  const cookieParts = [
    `sid=${sessionId}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_TTL_SECONDS}`,
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
  return sessionId;
};

/**
 * Retrieves the session payload from Redis using the sid cookie from the request header.
 */
export const getSession = async (cookieHeader?: string): Promise<{ userId: string } | null> => {
  const cookies = parseCookies(cookieHeader);
  const sessionId = cookies.sid;
  if (!sessionId) return null;

  const redis = getRedisClient();
  const rawSession = await redis.get(`session:${sessionId}`);
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
 * Destroys the active session in Redis and clears the sid cookie on the response.
 */
export const destroySession = async (req: Request, res: Response): Promise<void> => {
  const cookies = parseCookies(req.headers.cookie);
  const sessionId = cookies.sid;

  if (sessionId) {
    const redis = getRedisClient();
    await redis.del(`session:${sessionId}`);
  }

  const isProduction = config.NODE_ENV === 'production';
  const cookieParts = [
    'sid=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ];

  if (isProduction) {
    cookieParts.push('Secure');
  }

  res.setHeader('Set-Cookie', cookieParts.join('; '));
};
