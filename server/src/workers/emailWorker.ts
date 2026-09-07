import { Worker, Job, DelayedError } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { config } from '../config';
import { createRedisClient } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';
import { getPrismaClient } from '../utils/prisma';
import { sendEmail } from '../integrations/smtpIntegration';
import { checkAndReserveSendSlot } from '../services/rateLimitService';
import { notifySlackHourlyRateLimit } from '../services/slackNotificationService';
import { updateElasticEmailStatus } from '../services/elasticsearchService';

export const createEmailWorker = (): Worker<EmailJobData> => {
  const prisma = getPrismaClient();

  console.log(`[SCHEDULE-TRACE] Worker started`);
  console.log(`[SCHEDULE-TRACE] Worker ready (Queue '${EMAIL_SCHEDULER_QUEUE_NAME}')`);

  const worker = new Worker<EmailJobData>(
    EMAIL_SCHEDULER_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      console.log(`[SCHEDULE-TRACE] Worker received job ID: ${job.id} (Attempt: ${job.attemptsMade + 1}) for emailId: ${emailId}`);

      // 1. Retrieve Email record
      const email = await prisma.email.findUnique({
        where: { id: emailId },
        include: { senderAccount: true },
      });

      if (!email) {
        console.warn(`[SCHEDULE-TRACE] Job state: Failed — Email record not found for emailId: ${emailId}`);
        return;
      }

      console.log(`[SCHEDULE-TRACE] Job state: Current DB status = ${email.status}`);

      // 2. Prevent duplicate sends if status is already SENT
      if (email.status === 'SENT') {
        console.log(`[SCHEDULE-TRACE] Email ${emailId} is already SENT. Skipping processing.`);
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
          `[SCHEDULE-TRACE] Email ${emailId} could not be claimed (current status: ${email.status}, attemptsMade: ${job.attemptsMade}). Skipping.`
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
          `[SCHEDULE-TRACE] Job state: Redis rate limit enforcement error for sender ${senderAccountId}: ${redisErrMsg}`
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
          `[SCHEDULE-TRACE] Hourly rate limit reached for sender ${senderAccountId}. Rescheduling email ${emailId} to: ${new Date(rescheduleTimestamp).toISOString()}`
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
          `[SCHEDULE-TRACE] Enforcing send spacing delay of ${rateLimitResult.delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, rateLimitResult.delayMs));
      }

      // 7. Dispatch Email via SMTP
      console.log(`[SCHEDULE-TRACE] SMTP send started (to: ${email.recipientEmail}, subject: "${email.subject}")`);
      try {
        const fromAddress = email.senderAccount
          ? `"${email.senderAccount.name}" <${email.senderAccount.email}>`
          : undefined;

        let cleanBody = email.body;
        let attachmentsPayload: Array<{ filename: string; contentType?: string; content: string }> | undefined;

        // Primary: read structured JSON from DB attachments column
        if (email.attachments && Array.isArray(email.attachments) && (email.attachments as any[]).length > 0) {
          attachmentsPayload = (email.attachments as any[]).map((att: any) => ({
            filename: att.filename || att.name,
            contentType: att.contentType || att.type,
            content: att.content || att.base64,
          }));
        } else {
          // Fallback for legacy records using HTML comment syntax
          const attachmentMatch = email.body.match(/<!--ATTACHMENTS:(.*?)-->$/s);
          if (attachmentMatch && attachmentMatch[1]) {
            try {
              attachmentsPayload = JSON.parse(attachmentMatch[1]);
              cleanBody = email.body.replace(/<!--ATTACHMENTS:(.*?)-->$/s, '').trim();
            } catch (pErr) {
              console.warn(`[SCHEDULE-TRACE] Failed to parse legacy attachment JSON for email ${emailId}:`, pErr);
            }
          }
        }

        const result = await sendEmail({
          from: fromAddress,
          to: email.recipientEmail,
          subject: email.subject,
          body: cleanBody,
          attachments: attachmentsPayload,
        });

        const sentDate = new Date();
        console.log(`[SCHEDULE-TRACE] SMTP response: MessageId=${result.messageId}, PreviewUrl=${result.previewUrl || 'N/A'}`);

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

        console.log(`[SCHEDULE-TRACE] Email marked SENT for emailId: ${emailId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[SCHEDULE-TRACE] Email marked FAILED with exact error for emailId ${emailId}: ${errorMessage}`);

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
      connection: createRedisClient(),
      concurrency: config.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[SCHEDULE-TRACE] BullMQ Job completed (Job ID: ${job.id})`);
  });

  worker.on('failed', (job, err) => {
    if (err.name === 'DelayedError') {
      return;
    }
    console.error(`[SCHEDULE-TRACE] BullMQ Job failed (Job ID: ${job?.id}): ${err.message}`);
  });

  return worker;
};

