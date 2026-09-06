import { Request } from 'express';
import { User, EmailStatus } from '@prisma/client';

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{ field?: string; message: string }>;
}

export interface EmailJobData {
  emailId: string;
}

export const EMAIL_SCHEDULER_QUEUE_NAME = 'email-scheduler';

export interface ScheduleEmailDto {
  senderAccountId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
}

export interface ScheduledEmailItem {
  emailId: string;
  recipient: string;
  scheduledAt: Date;
  status: EmailStatus;
  jobId?: string;
}

export interface QueueFailureItem {
  emailId: string;
  recipient: string;
  error: string;
}

export interface IndexingStatusItem {
  success: boolean;
  indexedCount: number;
  error?: string;
}

export interface ScheduleCampaignResponse {
  campaignId: string;
  scheduledCount: number;
  queuedCount: number;
  scheduledEmails: ScheduledEmailItem[];
  queueFailures?: QueueFailureItem[];
  indexingStatus?: IndexingStatusItem;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedEmailListResponse<T> {
  emails: T[];
  pagination: PaginationMeta;
}

export interface ScheduledEmailListItem {
  id: string;
  recipientEmail: string;
  subject: string;
  scheduledAt: Date;
  status: EmailStatus;
  campaignId: string;
  createdAt: Date;
}

export interface SentEmailListItem {
  id: string;
  recipientEmail: string;
  subject: string;
  sentAt: Date | null;
  status: EmailStatus;
  campaignId: string;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
