import app from './app';
import { config } from './config';
import { registerGracefulShutdown } from './utils/shutdown';

const PORT = config.PORT;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT} in ${config.NODE_ENV} mode`);
  console.log(`Database URL: ${config.DATABASE_URL.replace(/:[^:@]+@/, ':****@')}`);
  console.log(`Redis Host: ${config.REDIS_HOST}:${config.REDIS_PORT}`);
  console.log(`Elasticsearch Node: ${config.ELASTICSEARCH_NODE}`);
});

registerGracefulShutdown(server);
