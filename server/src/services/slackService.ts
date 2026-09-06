import crypto from 'crypto';
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { getRedisClient } from '../utils/redis';

const prisma = new PrismaClient();

export interface SlackTokenPayload {
  teamId: string;
  teamName?: string;
  accessToken: string;
  webhookUrl?: string;
  channelId?: string;
  channelName?: string;
}

/**
 * Generates a cryptographically random OAuth state value and stores it in Redis
 * with a 10-minute (600s) TTL associated with the user ID.
 */
export const generateSlackOAuthState = async (userId: string): Promise<string> => {
  const state = crypto.randomBytes(32).toString('hex');
  const redis = getRedisClient();
  const key = `slack:oauth:state:${state}`;
  await redis.set(key, userId, 'EX', 600);
  return state;
};

/**
 * Atomically retrieves and deletes the OAuth state from Redis using GETDEL (or atomic Lua script).
 * Guarantees single-use state verification preventing replay attacks.
 */
export const validateAndDeleteOAuthState = async (state: string): Promise<string | null> => {
  if (!state || typeof state !== 'string') return null;
  const redis = getRedisClient();
  const key = `slack:oauth:state:${state}`;

  try {
    if (typeof (redis as any).getdel === 'function') {
      return (await (redis as any).getdel(key)) as string | null;
    } else {
      const luaScript = `
        local val = redis.call('GET', KEYS[1])
        if val then
          redis.call('DEL', KEYS[1])
        end
        return val
      `;
      return (await redis.eval(luaScript, 1, key)) as string | null;
    }
  } catch (err) {
    console.error('⚠️ Error consuming Slack OAuth state from Redis:', (err as Error).message);
    return null;
  }
};

/**
 * Exchanges the temporary Slack authorization code for an OAuth access token and incoming webhook details.
 * Strictly avoids logging access tokens, client secrets, or webhook URLs.
 */
export const exchangeSlackCode = async (code: string): Promise<SlackTokenPayload> => {
  const clientId = config.SLACK_CLIENT_ID;
  const clientSecret = config.SLACK_CLIENT_SECRET;
  const redirectUri = config.SLACK_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error('SLACK_CLIENT_ID and SLACK_CLIENT_SECRET must be configured in environment');
  }

  const params = new URLSearchParams({
    code,
    client_id: clientId,
    client_secret: clientSecret,
  });

  if (redirectUri) {
    params.append('redirect_uri', redirectUri);
  }

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Slack OAuth server returned HTTP status ${response.status}`);
  }

  const data: any = await response.json();

  if (!data.ok) {
    throw new Error(`Slack OAuth error: ${data.error || 'Token exchange failed'}`);
  }

  if (!data.access_token || !data.team?.id) {
    throw new Error('Slack OAuth response missing required access token or team ID');
  }

  return {
    teamId: data.team.id,
    teamName: data.team.name,
    accessToken: data.access_token,
    webhookUrl: data.incoming_webhook?.url,
    channelId: data.incoming_webhook?.channel_id,
    channelName: data.incoming_webhook?.channel,
  };
};

/**
 * Upserts the user's SlackIntegration record idempotently in MySQL.
 */
export const saveSlackIntegration = async (
  userId: string,
  tokenData: SlackTokenPayload
) => {
  return await prisma.slackIntegration.upsert({
    where: { userId },
    create: {
      userId,
      teamId: tokenData.teamId,
      teamName: tokenData.teamName || null,
      accessToken: tokenData.accessToken,
      webhookUrl: tokenData.webhookUrl || null,
      channelId: tokenData.channelId || null,
      channelName: tokenData.channelName || null,
    },
    update: {
      teamId: tokenData.teamId,
      teamName: tokenData.teamName || null,
      accessToken: tokenData.accessToken,
      webhookUrl: tokenData.webhookUrl || null,
      channelId: tokenData.channelId || null,
      channelName: tokenData.channelName || null,
    },
  });
};

/**
 * Removes the SlackIntegration record for the specified user.
 */
export const disconnectSlackIntegration = async (userId: string): Promise<void> => {
  await prisma.slackIntegration.deleteMany({
    where: { userId },
  });
};

/**
 * Returns safe Slack integration status without revealing tokens or secrets.
 */
export const getSlackIntegrationStatus = async (
  userId: string
): Promise<{ connected: boolean; teamName: string | null; channelName: string | null }> => {
  const integration = await prisma.slackIntegration.findUnique({
    where: { userId },
    select: {
      teamName: true,
      channelName: true,
    },
  });

  if (!integration) {
    return {
      connected: false,
      teamName: null,
      channelName: null,
    };
  }

  return {
    connected: true,
    teamName: integration.teamName || null,
    channelName: integration.channelName || null,
  };
};
