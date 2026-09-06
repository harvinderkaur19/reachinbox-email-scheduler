import { Client as ElasticClient } from '@elastic/elasticsearch';
import { config } from '../config';

let elasticInstance: ElasticClient | null = null;

export const getElasticClient = (): ElasticClient => {
  if (!elasticInstance) {
    elasticInstance = new ElasticClient({
      node: config.ELASTICSEARCH_NODE,
    });
  }
  return elasticInstance;
};

export const checkElasticConnection = async (): Promise<boolean> => {
  try {
    const client = getElasticClient();
    const health = await client.cluster.health({});
    return health.status === 'green' || health.status === 'yellow';
  } catch (error) {
    console.error('⚠️ Elasticsearch Ping Error:', (error as Error).message);
    return false;
  }
};

export const disconnectElastic = async (): Promise<void> => {
  if (elasticInstance) {
    await elasticInstance.close();
    elasticInstance = null;
  }
};
