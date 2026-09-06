import { Worker, Job, DelayedError } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { config } from '../config';
import { redisConnection } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';
import { getPrismaClient } from '../utils/prisma';
import { sendEmail } from '../integrations/smtpIntegration';
import { checkAndReserveSendSlot } from '../services/rateLimitService';
import { notifySlackHourlyRateLimit } from '../services/slackNotificationService';
import { updateElasticEmailStatus } from '../services/elasticsearchService';

export const createEmailWorker = (): Worker<EmailJobData> => {
  const prisma = getPrismaClient();

  const worker = new Worker<EmailJobData>(
    EMAIL_SCHEDULER_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      console.log(
        `[EmailWorker] Processing job ID: ${job.id} (Attempt: ${job.attemptsMade + 1}) for emailId: ${emailId}`
      );

      // 1. Retrieve Email record
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { senderAccount: true },
      });

      if (!email) {
        console.warn(`[EmailWorker] Email record not found for emailId: ${emailId}`);
        return;
      }

      // 2. Prevent duplicate sends if status is already SENT
      if (email.status === 'SENT') {
        console.log(`[EmailWorker] Email ${emailId} is already SENT. Skipping processing.`);
        return;
      }

      // 3. Differentiate attempt types for atomic state transition
      const targetWhereStatus: EmailStatus | { in: EmailStatus[] } =
        job.attemptsMade === 0 ? 'SCHEDULED' : { in: ['FAILED', 'PROCESSING'] };

      const claimResult = await prisma.email.updateMany({
        where: {
          id: emailId,
          status: targetWhereStatus,
        },
        data: {
          status: 'PROCESSING',
          attemptCount: { increment: 1 },
        },
      });

      if (claimResult.count === 0) {
        console.log(
          `[EmailWorker] Email ${emailId} could not be claimed (current status: ${email.status}, attemptsMade: ${job.attemptsMade}). Skipping.`
        );
        return;
      }

      // Sync claim status PROCESSING to Elasticsearch (non-fatal)
      await updateElasticEmailStatus(emailId, 'PROCESSING');

      // 4. Enforce Distributed Rate Limiting & Send Spacing per Sender
      const senderAccountId = email.senderAccountId || 'default-sender';
      let rateLimitResult;

      try {
        rateLimitResult = await checkAndReserveSendSlot(senderAccountId);
      } catch (redisErr) {
        const redisErrMsg = redisErr instanceof Error ? redisErr.message : String(redisErr);
        console.error(
          `[EmailWorker] Redis rate limit enforcement error for sender ${senderAccountId}: ${redisErrMsg}`
        );

        // Reset DB status to FAILED so BullMQ retry can claim it cleanly
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failureReason: `Redis rate limit failure: ${redisErrMsg}`,
          },
        });

        // Sync FAILED status to Elasticsearch
        await updateElasticEmailStatus(emailId, 'FAILED', { failureReason: redisErrMsg });

        // Fail job in a retryable manner so BullMQ exponential retry handles it without sending unprotected email
        throw redisErr;
      }

      // 5. Handle Hourly Quota Limit Exhaustion
      if (!rateLimitResult.allowed) {
        const rescheduleTimestamp = rateLimitResult.nextAvailableTimestamp || Date.now() + 3600000;
        console.log(
          `[EmailWorker] Hourly rate limit reached for sender ${senderAccountId} (count: ${rateLimitResult.currentCount}/${config.MAX_EMAILS_PER_HOUR_PER_SENDER}). Rescheduling email ${emailId} to next hour window: ${new Date(rescheduleTimestamp).toISOString()}`
        );

        // Attempt Slack Rate Limit Notification (fail-safe)
        await notifySlackHourlyRateLimit({
          senderAccountId,
          senderEmail: email.senderAccount?.email || senderAccountId,
          hourlyLimit: config.MAX_EMAILS_PER_HOUR_PER_SENDER,
        });

        // Reset DB status to SCHEDULED for next window
        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'SCHEDULED' },
        });

        // Sync SCHEDULED status to Elasticsearch
        await updateElasticEmailStatus(emailId, 'SCHEDULED');

        // Reschedule job in BullMQ to delayed state
        await job.moveToDelayed(rescheduleTimestamp, job.token);
        throw new DelayedError();
      }

      // 6. Handle Minimum Send Spacing Delay
      if (rateLimitResult.delayMs && rateLimitResult.delayMs > 0) {
        console.log(
          `[EmailWorker] Enforcing minimum send spacing of ${config.MIN_SEND_DELAY_MS}ms for sender ${senderAccountId}. Waiting ${rateLimitResult.delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, rateLimitResult.delayMs));
      }

      // 7. Dispatch Email via SMTP
      try {
        const fromAddress = email.senderAccount
          ? `"${email.senderAccount.name}" <${email.senderAccount.email}>`
          : undefined;

        const result = await sendEmail({
          from: fromAddress,
          to: email.recipientEmail,
          subject: email.subject,
          body: email.body,
        });

        const sentDate = new Date();

        // 8. On Success: Update status = SENT, sentAt = now, clear failureReason
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: sentDate,
            failureReason: null,
          },
        });

        // Sync SENT status to Elasticsearch (non-fatal)
        await updateElasticEmailStatus(emailId, 'SENT', { sentAt: sentDate });

        console.log(
          `[EmailWorker] Email ${emailId} successfully sent to ${email.recipientEmail} (Sender: ${senderAccountId}, HourlyCount: ${rateLimitResult.currentCount}). MessageId: ${result.messageId}`
        );
        if (result.previewUrl) {
          console.log(`[EmailWorker] Ethereal Preview URL: ${result.previewUrl}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[EmailWorker] Error sending email ${emailId}: ${errorMessage}`);

        // On Failure: Update status = FAILED, set failureReason
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failureReason: errorMessage,
          },
        });

        // Sync FAILED status to Elasticsearch
        await updateElasticEmailStatus(emailId, 'FAILED', { failureReason: errorMessage });

        // Rethrow so BullMQ triggers exponential backoff retry
        throw error;
      }
    },
    {
      connection: redisConnection,
      concurrency: config.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[EmailWorker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job, err) => {
    if (err.name === 'DelayedError') {
      // Normal rate limit rescheduling, not an error
      return;
    }
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
};
