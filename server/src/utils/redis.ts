import Redis from 'ioredis';
import { config } from '../config';

export const redisConnection = config.REDIS_URL
  ? new Redis(config.REDIS_URL, { maxRetriesPerRequest: null, lazyConnect: true })
  : {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
      maxRetriesPerRequest: null,
    };

let redisInstance: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!redisInstance) {
    if (config.REDIS_URL) {
      redisInstance = new Redis(config.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
    } else {
      redisInstance = new Redis({
        host: config.REDIS_HOST,
        port: config.REDIS_PORT,
        lazyConnect: true,
        maxRetriesPerRequest: null,
      });
    }

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
