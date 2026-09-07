import { Queue } from 'bullmq';
import { createRedisClient } from '../utils/redis';
import { EMAIL_SCHEDULER_QUEUE_NAME, EmailJobData } from '../types';

export const emailQueue = new Queue<EmailJobData>(EMAIL_SCHEDULER_QUEUE_NAME, {
  connection: createRedisClient(),
});

export const closeEmailQueue = async (): Promise<void> => {
  await emailQueue.close();
};
