import { Email } from '@prisma/client';
import { getElasticClient } from '../utils/elasticsearch';

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const ELASTIC_EMAILS_INDEX = 'emails';

/**
 * Idempotently initializes the Elasticsearch `emails` index with explicit field mappings if it does not exist.
 */
export const ensureElasticIndex = async (): Promise<boolean> => {
  try {
    const client = getElasticClient();
    const exists = await client.indices.exists({ index: ELASTIC_EMAILS_INDEX });

    if (!exists) {
      await client.indices.create({
        index: ELASTIC_EMAILS_INDEX,
        body: {
          mappings: {
            properties: {
              id: { type: 'keyword' },
              userId: { type: 'keyword' },
              campaignId: { type: 'keyword' },
              senderAccountId: { type: 'keyword' },
              recipientEmail: {
                type: 'text',
                fields: {
                  keyword: { type: 'keyword' },
                },
              },
              subject: { type: 'text' },
              body: { type: 'text' },
              status: { type: 'keyword' },
              scheduledAt: { type: 'date' },
              sentAt: { type: 'date' },
              createdAt: { type: 'date' },
              updatedAt: { type: 'date' },
            },
          },
        },
      });
      console.log(`[ElasticsearchService] Index '${ELASTIC_EMAILS_INDEX}' created successfully.`);
    }
    return true;
  } catch (err) {
    console.warn(`⚠️ [ElasticsearchService] Failed to initialize index '${ELASTIC_EMAILS_INDEX}': ${(err as Error).message}`);
    return false;
  }
};

/**
 * Indexes Email records in Elasticsearch after MySQL transaction completes.
 * Returns indexing status without failing or rolling back valid MySQL records.
 */
export const indexEmails = async (
  emails: Email[],
  userId: string
): Promise<{ success: boolean; indexedCount: number; error?: string }> => {
  if (!emails || emails.length === 0) {
    return { success: true, indexedCount: 0 };
  }

  try {
    const client = getElasticClient();
    const operations = emails.flatMap((email) => [
      { index: { _index: ELASTIC_EMAILS_INDEX, _id: email.id } },
      {
        id: email.id,
        userId,
        campaignId: email.campaignId,
        senderAccountId: email.senderAccountId,
        recipientEmail: email.recipientEmail,
        subject: email.subject,
        body: email.body,
        status: email.status,
        scheduledAt: email.scheduledAt ? new Date(email.scheduledAt).toISOString() : null,
        sentAt: email.sentAt ? new Date(email.sentAt).toISOString() : null,
        createdAt: email.createdAt ? new Date(email.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: email.updatedAt ? new Date(email.updatedAt).toISOString() : new Date().toISOString(),
      },
    ]);

    const bulkResponse = await client.bulk({ refresh: true, body: operations });

    if (bulkResponse.errors) {
      console.warn(`⚠️ [ElasticsearchService] Partial bulk indexing errors occurred in index '${ELASTIC_EMAILS_INDEX}'.`);
      return {
        success: false,
        indexedCount: emails.length - bulkResponse.items.filter((item) => item.index && item.index.error).length,
        error: 'Partial bulk indexing failure',
      };
    }

    return { success: true, indexedCount: emails.length };
  } catch (err) {
    const errMsg = (err as Error).message;
    console.warn(`⚠️ [ElasticsearchService] Bulk indexing failed for campaign emails: ${errMsg}`);
    return { success: false, indexedCount: 0, error: errMsg };
  }
};

/**
 * Updates an Email document's status in Elasticsearch when modified by worker processes.
 */
export const updateElasticEmailStatus = async (
  emailId: string,
  status: string,
  options?: { sentAt?: Date | null; failureReason?: string | null }
): Promise<{ success: boolean; error?: string }> => {
  try {
    const client = getElasticClient();
    await client.update({
      index: ELASTIC_EMAILS_INDEX,
      id: emailId,
      refresh: true,
      body: {
        doc: {
          status,
          sentAt: options?.sentAt ? new Date(options.sentAt).toISOString() : null,
          failureReason: options?.failureReason || null,
          updatedAt: new Date().toISOString(),
        },
      },
    });
    return { success: true };
  } catch (err) {
    const errMsg = (err as Error).message;
    console.warn(`⚠️ [ElasticsearchService] Failed to update Elasticsearch status for email ${emailId}: ${errMsg}`);
    return { success: false, error: errMsg };
  }
};

/**
 * Full-text search for emails scoped strictly to the current user ID.
 * Returns HTTP 503 error if Elasticsearch is unavailable.
 */
export const searchEmails = async (
  userId: string,
  query?: string
): Promise<{ total: number; query?: string; emails: any[] }> => {
  try {
    const client = getElasticClient();
    const cleanQuery = query ? query.trim() : '';

    const mustClause = cleanQuery
      ? [
          {
            multi_match: {
              query: cleanQuery,
              fields: ['recipientEmail^2', 'subject^3', 'body'],
            },
          },
        ]
      : [{ match_all: {} }];

    const response = await client.search({
      index: ELASTIC_EMAILS_INDEX,
      body: {
        query: {
          bool: {
            filter: [{ term: { userId } }],
            must: mustClause,
          },
        },
      },
    });

    const hits = response.hits.hits || [];
    const total = typeof response.hits.total === 'number' ? response.hits.total : response.hits.total?.value || hits.length;

    const emails = hits.map((hit: any) => hit._source);

    return {
      total,
      query: cleanQuery || undefined,
      emails,
    };
  } catch (err) {
    const errMsg = (err as Error).message;
    console.error(`⚠️ [ElasticsearchService] Search error for user ${userId}: ${errMsg}`);
    throw new ServiceError('Search service is currently unavailable', 503);
  }
};
