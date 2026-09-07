import { EmailStatus } from '@prisma/client';
import { getPrismaClient } from '../utils/prisma';
import {
  PaginatedEmailListResponse,
  ScheduledEmailListItem,
  SentEmailListItem,
} from '../types';

export class ServiceError extends Error {
  constructor(
    message: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

/**
 * Validates and parses query parameters for pagination.
 */
export const parsePaginationParams = (
  pageQuery?: unknown,
  limitQuery?: unknown
): { page: number; limit: number } => {
  let page = 1;
  let limit = 20;

  if (pageQuery !== undefined && pageQuery !== '') {
    const parsedPage = parseInt(String(pageQuery), 10);
    if (isNaN(parsedPage) || parsedPage < 1 || String(parsedPage) !== String(pageQuery).trim()) {
      throw new ServiceError('Invalid page parameter. Must be a positive integer >= 1.', 400);
    }
    page = parsedPage;
  }

  if (limitQuery !== undefined && limitQuery !== '') {
    const parsedLimit = parseInt(String(limitQuery), 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || String(parsedLimit) !== String(limitQuery).trim()) {
      throw new ServiceError('Invalid limit parameter. Must be a positive integer >= 1.', 400);
    }
    limit = Math.min(parsedLimit, 100);
  }

  return { page, limit };
};

/**
 * Retrieves paginated scheduled emails belonging strictly to the specified user ID.
 * Ordered by scheduledAt ASC.
 */
export const getScheduledEmailsService = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedEmailListResponse<ScheduledEmailListItem>> => {
  const prisma = getPrismaClient();

  const whereClause = {
    campaign: {
      userId,
    },
    status: 'SCHEDULED' as const,
  };

  const total = await prisma.email.count({
    where: whereClause,
  });

  const skip = (page - 1) * limit;

  const emails = await prisma.email.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: {
      scheduledAt: 'asc',
    },
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      body: true,
      attachments: true,
      scheduledAt: true,
      status: true,
      campaignId: true,
      createdAt: true,
    },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    emails: emails as any[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Retrieves paginated sent and failed emails belonging strictly to the specified user ID.
 * Ordered by sentAt DESC with updatedAt DESC fallback.
 */
export const getSentEmailsService = async (
  userId: string,
  page: number,
  limit: number
): Promise<PaginatedEmailListResponse<SentEmailListItem>> => {
  const prisma = getPrismaClient();

  const whereClause = {
    campaign: {
      userId,
    },
    status: {
      in: ['SENT', 'FAILED'] as EmailStatus[],
    },
  };

  const total = await prisma.email.count({
    where: whereClause,
  });

  const skip = (page - 1) * limit;

  const emails = await prisma.email.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: [
      { sentAt: 'desc' },
      { updatedAt: 'desc' },
    ],
    select: {
      id: true,
      recipientEmail: true,
      subject: true,
      body: true,
      attachments: true,
      sentAt: true,
      status: true,
      campaignId: true,
      createdAt: true,
    },
  });

  const totalPages = Math.ceil(total / limit);

  return {
    emails: emails as any[],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  };
};

/**
 * Retrieves single email details by ID belonging strictly to the specified user ID.
 */
export const getEmailByIdService = async (userId: string, emailId: string) => {
  const prisma = getPrismaClient();

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: {
      campaign: true,
      senderAccount: true,
    },
  });

  if (!email || email.campaign.userId !== userId) {
    throw new ServiceError('Email record not found or unauthorized', 404);
  }

  return email;
};
