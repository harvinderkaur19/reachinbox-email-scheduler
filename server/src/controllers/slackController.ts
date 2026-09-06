import { Request, Response } from 'express';
import { config } from '../config';
import {
  generateSlackOAuthState,
  validateAndDeleteOAuthState,
  exchangeSlackCode,
  saveSlackIntegration,
  disconnectSlackIntegration,
  getSlackIntegrationStatus,
} from '../services/slackService';

/**
 * Initiates the Slack OAuth 2.0 flow by generating a single-use state token stored in Redis
 * and redirecting the user to Slack's authorization endpoint with required bot scopes.
 */
export const startOAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User context missing',
      });
      return;
    }

    const clientId = config.SLACK_CLIENT_ID;
    const redirectUri = config.SLACK_REDIRECT_URI;

    if (!clientId) {
      res.status(500).json({
        success: false,
        error: 'SLACK_CLIENT_ID environment variable is not configured',
      });
      return;
    }

    const state = await generateSlackOAuthState(req.user.id);
    const scope = 'chat:write,incoming-webhook';

    const authUrl = new URL('https://slack.com/oauth/v2/authorize');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('scope', scope);
    authUrl.searchParams.append('state', state);

    if (redirectUri) {
      authUrl.searchParams.append('redirect_uri', redirectUri);
    }

    res.redirect(authUrl.toString());
  } catch (error) {
    console.error('⚠️ Error starting Slack OAuth:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to initiate Slack OAuth flow',
    });
  }
};

/**
 * Handles the OAuth callback from Slack, validating state atomically via Redis GETDEL,
 * exchanging authorization code for bot tokens, and saving integration details in MySQL.
 */
export const handleOAuthCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, state, error: slackError, error_description } = req.query;

    if (slackError) {
      res.status(400).json({
        success: false,
        error: (error_description as string) || (slackError as string) || 'Slack OAuth authorization denied',
      });
      return;
    }

    if (!code || typeof code !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing authorization code parameter',
      });
      return;
    }

    if (!state || typeof state !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Missing state parameter',
      });
      return;
    }

    // Atomically validate and consume state from Redis (GETDEL)
    const userId = await validateAndDeleteOAuthState(state);

    if (!userId) {
      res.status(400).json({
        success: false,
        error: 'Invalid, expired, or previously consumed OAuth state parameter',
      });
      return;
    }

    // Exchange authorization code for token payload
    const tokenPayload = await exchangeSlackCode(code);

    // Save integration in MySQL via Prisma upsert
    await saveSlackIntegration(userId, tokenPayload);

    // Redirect to frontend dashboard with success query param
    res.redirect(`${config.CLIENT_URL}/?slack=connected`);
  } catch (error) {
    console.error('⚠️ Error handling Slack OAuth callback:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: (error as Error).message || 'Failed to complete Slack OAuth token exchange',
    });
  }
};

/**
 * Disconnects Slack integration for the current user by removing the database record.
 */
export const disconnect = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User context missing',
      });
      return;
    }

    await disconnectSlackIntegration(req.user.id);

    res.status(200).json({
      success: true,
      message: 'Slack integration disconnected successfully',
    });
  } catch (error) {
    console.error('⚠️ Error disconnecting Slack integration:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Slack integration',
    });
  }
};

/**
 * Returns safe Slack connection status for the current user.
 */
export const getStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user || !req.user.id) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized: User context missing',
      });
      return;
    }

    const status = await getSlackIntegrationStatus(req.user.id);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('⚠️ Error fetching Slack integration status:', (error as Error).message);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Slack status',
    });
  }
};
