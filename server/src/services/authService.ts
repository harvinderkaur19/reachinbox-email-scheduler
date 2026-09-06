import crypto from 'crypto';
import { getRedisClient } from '../utils/redis';
import { getPrismaClient } from '../utils/prisma';
import { config } from '../config';
import { User } from '@prisma/client';

const OAUTH_STATE_TTL_SECONDS = 600; // 10 minutes

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Generates a cryptographically random OAuth state token and stores it in Redis with 10m TTL.
 */
export const generateOAuthState = async (): Promise<string> => {
  const state = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();
  await redis.set(`google:oauth:state:${state}`, '1', 'EX', OAUTH_STATE_TTL_SECONDS);
  return state;
};

/**
 * Atomically validates and consumes the OAuth state token from Redis.
 */
export const validateOAuthState = async (state: string): Promise<boolean> => {
  if (!state) return false;
  const redis = getRedisClient();
  const key = `google:oauth:state:${state}`;

  // Redis GETDEL guarantees atomic single-use state consumption
  let val: string | null = null;
  if (typeof (redis as any).getdel === 'function') {
    val = await (redis as any).getdel(key);
  } else {
    // Fallback Lua script for older Redis versions
    const luaScript = `
      local val = redis.call('GET', KEYS[1])
      if val then
        redis.call('DEL', KEYS[1])
      end
      return val
    `;
    val = (await redis.eval(luaScript, 1, key)) as string | null;
  }

  return val === '1';
};

/**
 * Constructs the Google OAuth authorization URL.
 */
export const getGoogleAuthUrl = (state: string): string => {
  const clientId = config.GOOGLE_CLIENT_ID;
  const redirectUri = config.GOOGLE_CALLBACK_URL;

  if (!clientId || !redirectUri) {
    throw new Error('Google OAuth configuration missing in environment');
  }

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', 'openid email profile');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('prompt', 'select_account');

  return authUrl.toString();
};

/**
 * Exchanges Google authorization code for OAuth tokens.
 */
export const exchangeCodeForTokens = async (code: string): Promise<{ access_token: string }> => {
  const clientId = config.GOOGLE_CLIENT_ID;
  const clientSecret = config.GOOGLE_CLIENT_SECRET;
  const redirectUri = config.GOOGLE_CALLBACK_URL;

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth credentials missing in environment');
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('⚠️ Google token exchange failed:', errorBody);
    throw new Error('Failed to exchange authorization code with Google');
  }

  const data = (await response.json()) as { access_token: string };
  if (!data.access_token) {
    throw new Error('Google token response did not contain access_token');
  }

  return data;
};

/**
 * Fetches user profile information from Google using access token.
 */
export const fetchGoogleUserProfile = async (accessToken: string): Promise<GoogleUserProfile> => {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('⚠️ Google userinfo fetch failed:', errorBody);
    throw new Error('Failed to retrieve user profile from Google');
  }

  const profile = (await response.json()) as GoogleUserProfile;
  if (!profile.id || !profile.email) {
    throw new Error('Incomplete user profile received from Google');
  }

  return profile;
};

/**
 * Deterministically finds or creates/updates a User record in MySQL via Prisma (Correction 4).
 * Order of matching:
 * 1. Match by googleId
 * 2. Match by email (associate googleId)
 * 3. Create new User
 */
export const upsertGoogleUser = async (profile: GoogleUserProfile): Promise<User> => {
  const prisma = getPrismaClient();

  // 1. Try matching by googleId
  let user = await prisma.user.findUnique({
    where: { googleId: profile.id },
  });

  if (user) {
    // Update name and avatarUrl if updated
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: profile.name || user.name,
        email: profile.email || user.email,
        avatarUrl: profile.picture || user.avatarUrl,
      },
    });
  } else {
    // 2. Try matching by email
    user = await prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (user) {
      // Associate googleId and update details
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: profile.id,
          name: profile.name || user.name,
          avatarUrl: profile.picture || user.avatarUrl,
        },
      });
    } else {
      // 3. Create new User
      user = await prisma.user.create({
        data: {
          googleId: profile.id,
          email: profile.email,
          name: profile.name || profile.email.split('@')[0],
          avatarUrl: profile.picture || null,
        },
      });
    }
  }

  // Ensure an active default SenderAccount exists for the provisioned user across ALL branches
  await ensureDefaultSenderAccount(user.id, user.name, user.email);

  return user;
};

/**
 * Idempotently creates a default SenderAccount for a user if none exists.
 */
export const ensureDefaultSenderAccount = async (
  userId: string,
  name: string,
  email: string
): Promise<void> => {
  const prisma = getPrismaClient();
  const existingSender = await prisma.senderAccount.findFirst({
    where: { userId },
  });

  if (!existingSender) {
    await prisma.senderAccount.create({
      data: {
        userId,
        name: name || 'Default Sender',
        email,
        isActive: true,
      },
    });
  }
};
