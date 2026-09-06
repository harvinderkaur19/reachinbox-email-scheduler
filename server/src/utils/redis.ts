import Redis from 'ioredis';
import { config } from '../config';

export const redisConnection = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  maxRetriesPerRequest: null,
};

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisInstance) {
    redisInstance = new Redis({
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      lazyConnect: true,
      maxRetriesPerRequest: null, // Required for BullMQ compatibility in future phases
    });

    redisInstance.on('error', (err) => {
      console.error('⚠️ Redis Client Error:', err.message);
    });
  }
  return redisInstance;
};

export const connectRedis = async (): Promise<void> => {
  const client = getRedisClient();
  if (client.status === 'wait') {
    await client.connect();
  }
};

export const disconnectRedis = async (): Promise<void> => {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
  }
};
