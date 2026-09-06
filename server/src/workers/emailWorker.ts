import { Worker, Job } from 'bullmq';
import { config } from '../config';
import { redisConnection } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';
import { getPrismaClient } from '../utils/prisma';

export const createEmailWorker = (): Worker<EmailJobData> => {
  const prisma = getPrismaClient();

  const worker = new Worker<EmailJobData>(
    EMAIL_SCHEDULER_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const { emailId } = job.data;
      console.log(`[EmailWorker] Processing job ID: ${job.id} for emailId: ${emailId}`);

      const email = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!email) {
        console.warn(`[EmailWorker] Email record not found for emailId: ${emailId}`);
        return;
      }

      console.log(
        `[EmailWorker] Executing scheduled email job - emailId: ${email.id}, recipientEmail: ${email.recipientEmail}`
      );
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
    console.error(`[EmailWorker] Job ${job?.id} failed with error:`, err);
  });

  return worker;
};
