import { Worker, Job } from 'bullmq';
import { EmailStatus } from '@prisma/client';
import { config } from '../config';
import { redisConnection } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';
import { getPrismaClient } from '../utils/prisma';
import { sendEmail } from '../integrations/smtpIntegration';

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
      // Initial attempt (attemptsMade === 0): expect status 'SCHEDULED'
      // Retry attempt (attemptsMade > 0): expect status 'FAILED' or 'PROCESSING'
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

      // 4. Dispatch Email via SMTP
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

        // 5. On Success: Update status = SENT, sentAt = now, clear failureReason
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            failureReason: null,
          },
        });

        console.log(
          `[EmailWorker] Email ${emailId} successfully sent to ${email.recipientEmail}. MessageId: ${result.messageId}`
        );
        if (result.previewUrl) {
          console.log(`[EmailWorker] Ethereal Preview URL: ${result.previewUrl}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[EmailWorker] Error sending email ${emailId}: ${errorMessage}`);

        // 6. On Failure: Update status = FAILED, set failureReason
        await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            failureReason: errorMessage,
          },
        });

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
    console.error(`[EmailWorker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
};
