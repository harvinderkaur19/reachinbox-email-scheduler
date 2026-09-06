import { getPrismaClient } from '../utils/prisma';
import { getRedisClient } from '../utils/redis';

export interface SlackRateLimitNotificationInput {
  senderAccountId: string;
  senderEmail: string;
  hourlyLimit: number;
}

/**
 * Sends a Slack notification when a sender's hourly email rate limit is reached.
 * Uses atomic Redis deduplication per sender per UTC hour window (slack:rate-limit-alert:{senderAccountId}:{YYYY-MM-DD-HH}).
 * If Slack is not connected or notification fails, handles cleanly without crashing or blocking email rescheduling.
 */
export const notifySlackHourlyRateLimit = async (
  input: SlackRateLimitNotificationInput
): Promise<void> => {
  const { senderAccountId, senderEmail, hourlyLimit } = input;

  try {
    const prisma = getPrismaClient();

    // 1. Look up user and SlackIntegration
    const senderAccount = await prisma.senderAccount.findUnique({
      where: { id: senderAccountId },
      include: {
        user: {
          include: {
            slack: true,
          },
        },
      },
    });

    const slack = senderAccount?.user?.slack;
    if (!slack || !slack.accessToken || !slack.channelId) {
      console.log(
        `[SlackNotification] No connected Slack integration with valid channelId found for sender ${senderAccountId}. Skipping notification.`
      );
      return;
    }

    // 2. Format current UTC hour window
    const now = new Date();
    const utcYear = now.getUTCFullYear();
    const utcMonth = String(now.getUTCMonth() + 1).padStart(2, '0');
    const utcDay = String(now.getUTCDate()).padStart(2, '0');
    const utcHour = String(now.getUTCHours()).padStart(2, '0');
    const windowText = `${utcYear}-${utcMonth}-${utcDay} ${utcHour}:00 UTC`;
    const windowKey = `${utcYear}-${utcMonth}-${utcDay}-${utcHour}`;

    // 3. Atomic Redis Deduplication per Sender per UTC Hour Window
    const redis = getRedisClient();
    const dedupKey = `slack:rate-limit-alert:${senderAccountId}:${windowKey}`;
    const acquired = await redis.set(dedupKey, '1', 'EX', 7200, 'NX');

    if (!acquired) {
      console.log(
        `[SlackNotification] Notification already sent for sender ${senderAccountId} in UTC window ${windowKey}. Skipping duplicate alert.`
      );
      return;
    }

    // 4. Construct Slack message text
    const messageText = `⚠️ Email rate limit reached\nSender: ${senderEmail}\nHourly limit: ${hourlyLimit}\nWindow: ${windowText}\nAdditional emails have been rescheduled to the next available hour.`;

    // 5. Dispatch Slack Web API chat.postMessage using channelId
    try {
      const response = await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${slack.accessToken}`,
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify({
          channel: slack.channelId,
          text: messageText,
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack API HTTP error status ${response.status}`);
      }

      const data: any = await response.json();

      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'chat.postMessage failed'}`);
      }

      console.log(
        `[SlackNotification] Successfully posted rate limit notification for sender ${senderAccountId} to channel ${slack.channelId}.`
      );
    } catch (apiErr) {
      // Release deduplication key on sending failure so subsequent attempts in this window can retry
      await redis.del(dedupKey);
      console.warn(
        `[SlackNotification] Failed to send Slack rate limit alert for sender ${senderAccountId}: ${(apiErr as Error).message}`
      );
    }
  } catch (err) {
    // Fail-safe error handling to prevent worker crashes
    console.error(
      `[SlackNotification] Unexpected error in notifySlackHourlyRateLimit: ${(err as Error).message}`
    );
  }
};
