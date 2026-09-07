import app from './app';
import { config } from './config';
import { registerGracefulShutdown } from './utils/shutdown';
import { ensureElasticIndex } from './services/elasticsearchService';
import { createEmailWorker } from './workers/emailWorker';
import { getTransporter } from './integrations/smtpIntegration';

const PORT = config.PORT;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on port ${PORT} on 0.0.0.0 in ${config.NODE_ENV} mode`);
  console.log(`Database URL: ${config.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(
    `Redis: ${config.REDIS_URL ? config.REDIS_URL.replace(/:[^:@]+@/, ':****@') : `${config.REDIS_HOST}:${config.REDIS_PORT}`}`
  );
  console.log(`Elasticsearch Node: ${config.ELASTICSEARCH_NODE}`);

  // Perform startup Ethereal SMTP verification
  try {
    await getTransporter();
  } catch (sErr) {
    console.warn('⚠️ [Server] Startup SMTP verification warning:', (sErr as Error).message);
  }

  // Initialize Elasticsearch index and mapping idempotently (non-blocking)
  await ensureElasticIndex();

  // Initialize BullMQ email worker in-process to guarantee job processing even if separate worker service is omitted
  try {
    createEmailWorker();
    console.log('[Server] In-process BullMQ email worker initialized successfully.');
  } catch (wErr) {
    console.error('⚠️ [Server] Failed to initialize in-process email worker:', wErr);
  }
});

registerGracefulShutdown(server);

