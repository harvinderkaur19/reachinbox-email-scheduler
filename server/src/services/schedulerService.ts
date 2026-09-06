import { Job } from 'bullmq';
import { emailQueue } from '../queues/emailQueue';
import { EmailJobData } from '../types';

/**
 * Schedules an email job with BullMQ delayed queueing.
 *
 * @param emailId - The unique ID of the Email record to process.
 * @param scheduledAt - The target DateTime when the email should be sent.
 * @returns The created BullMQ Job instance.
 */
export const scheduleEmailJob = async (
  emailId: string,
  scheduledAt: Date | string | number
): Promise<Job<EmailJobData>> => {
  const scheduledTime = new Date(scheduledAt).getTime();
  if (isNaN(scheduledTime)) {
    throw new Error(`Invalid scheduledAt date provided: ${scheduledAt}`);
  }

  const now = Date.now();
  const rawDelay = scheduledTime - now;
  const delay = Math.max(0, rawDelay);

  // Deterministic jobId to prevent duplicate delayed jobs for the same Email record
  const jobId = `email-${emailId}`;

  console.log(`[Scheduler] Job created for email ID ${emailId} with calculated delay ${delay}ms (target: ${new Date(scheduledTime).toISOString()})`);

  const job = await emailQueue.add(
    'send-email',
    { emailId },
    {
      delay,
      jobId,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    }
  );

  console.log(`[Scheduler] Job added to Redis (jobId: ${job.id}, queue: email-scheduler)`);

  return job;
};

