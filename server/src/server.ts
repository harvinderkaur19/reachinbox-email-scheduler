import app from './app';
import { config } from './config';
import { registerGracefulShutdown } from './utils/shutdown';
import { ensureElasticIndex } from './services/elasticsearchService';

const PORT = config.PORT;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`Server listening on port ${PORT} on 0.0.0.0 in ${config.NODE_ENV} mode`);
  console.log(`Database URL: ${config.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(
    `Redis: ${config.REDIS_URL ? config.REDIS_URL.replace(/:[^:@]+@/, ':****@') : `${config.REDIS_HOST}:${config.REDIS_PORT}`}`
  );
  console.log(`Elasticsearch Node: ${config.ELASTICSEARCH_NODE}`);

  // Initialize Elasticsearch index and mapping idempotently
  await ensureElasticIndex();
});

registerGracefulShutdown(server);
