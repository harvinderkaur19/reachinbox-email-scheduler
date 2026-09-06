import { Server } from 'http';
import { disconnectPrisma } from './prisma';
import { disconnectRedis } from './redis';
import { disconnectElastic } from './elasticsearch';

export const registerGracefulShutdown = (server?: Server): void => {
  const shutdown = async (signal: string) => {
    console.log(`\nRECEIVED ${signal}. Starting graceful shutdown...`);

    if (server) {
      server.close(() => {
        console.log('HTTP server listener closed.');
      });
    }

    try {
      await disconnectPrisma();
      console.log('PostgreSQL (Prisma) connection closed.');
    } catch (err) {
      console.error('Error disconnecting PostgreSQL (Prisma):', err);
    }

    try {
      await disconnectRedis();
      console.log('Redis connection closed.');
    } catch (err) {
      console.error('Error disconnecting Redis:', err);
    }

    try {
      await disconnectElastic();
      console.log('Elasticsearch connection closed.');
    } catch (err) {
      console.error('Error disconnecting Elasticsearch:', err);
    }

    console.log('Graceful shutdown completed successfully.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
};
