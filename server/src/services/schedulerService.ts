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

  console.log(`[SCHEDULE-TRACE] Current server time: ${new Date(now).toISOString()} (${now}ms)`);
  console.log(`[SCHEDULE-TRACE] Parsed scheduled time: ${new Date(scheduledTime).toISOString()} (${scheduledTime}ms)`);
  console.log(`[SCHEDULE-TRACE] Calculated delay: raw=${rawDelay}ms, final=${delay}ms`);
  console.log(`[SCHEDULE-TRACE] Queue name: email-scheduler`);
  console.log(`[SCHEDULE-TRACE] Redis connection confirmed`);

  // Deterministic jobId to prevent duplicate delayed jobs for the same Email record
  const jobId = `email-${emailId}`;

  // If a job with this jobId already exists (e.g. from prior schedule or edit), remove it first so delay is updated
  try {
    const existingJob = await emailQueue.getJob(jobId);
    if (existingJob) {
      console.log(`[SCHEDULE-TRACE] Removing existing job ${jobId} before re-queueing updated schedule`);
      await existingJob.remove();
    }
  } catch (remErr) {
    console.warn(`[SCHEDULE-TRACE] Warning checking/removing existing job ${jobId}:`, remErr);
  }

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

  console.log(`[SCHEDULE-TRACE] Job added`);
  console.log(`[SCHEDULE-TRACE] Job ID: ${job.id}`);

  return job;
};

