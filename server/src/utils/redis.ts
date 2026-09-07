import Redis from 'ioredis';
import { config } from '../config';

export const createRedisClient = (): Redis => {
  if (config.REDIS_URL) {
    return new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return new Redis({
    host: config.REDIS_HOST,
    port: config.REDIS_PORT,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
};

export const redisConnection = createRedisClient();

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisInstance) {
    redisInstance = createRedisClient();
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

