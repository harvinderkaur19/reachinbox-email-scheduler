import { Queue } from 'bullmq';
import { redisConnection } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';

export const emailQueue = new Queue<EmailJobData>(EMAIL_SCHEDULER_QUEUE_NAME, {
  connection: redisConnection,
});

export const closeEmailQueue = async (): Promise<void> => {
  await emailQueue.close();
};
