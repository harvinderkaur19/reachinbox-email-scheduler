import { config } from './config';
import { createEmailWorker } from './workers/emailWorker';
import { closeEmailQueue } from './queues/emailQueue';
import { connectPrisma, disconnectPrisma } from './utils/prisma';

async function startWorkerProcess() {
  console.log(`[Worker Process] Initializing BullMQ Worker...`);
  console.log(`[Worker Process] Redis Host: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
  console.log(`[Worker Process] Worker Concurrency: ${config.WORKER_CONCURRENCY}`);

  // Ensure DB connection
  await connectPrisma();

  const worker = createEmailWorker();
  console.log(`[Worker Process] Email worker started and listening on queue 'email-scheduler'.`);

  const shutdown = async (signal: string) => {
    console.log(`\n[Worker Process] Received ${signal}. Starting graceful shutdown...`);
    try {
      await worker.close();
      console.log('[Worker Process] BullMQ worker closed.');
    } catch (err) {
      console.error('[Worker Process] Error closing worker:', err);
    }

    try {
      await closeEmailQueue();
      console.log('[Worker Process] BullMQ queue connection closed.');
    } catch (err) {
      console.error('[Worker Process] Error closing queue connection:', err);
    }

    try {
      await disconnectPrisma();
      console.log('[Worker Process] Prisma database connection closed.');
    } catch (err) {
      console.error('[Worker Process] Error disconnecting Prisma:', err);
    }

    console.log('[Worker Process] Graceful shutdown completed cleanly.');
    process.exit(0);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

startWorkerProcess().catch((err) => {
  console.error('[Worker Process] Fatal error starting worker process:', err);
  process.exit(1);
});
