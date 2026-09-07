export type EmailStatusType = 'SCHEDULED' | 'SENT' | 'FAILED' | 'PROCESSING';

export interface SenderAccountItem {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  senderAccounts?: SenderAccountItem[];
}

export interface ScheduleEmailAttachment {
  filename: string;
  contentType?: string;
  content: string; // base64 string
}

export interface ScheduleEmailInput {
  senderAccountId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  attachments?: ScheduleEmailAttachment[];
}


export interface ScheduleCampaignResult {
  campaignId: string;
  scheduledCount: number;
  queuedCount: number;
  queueFailures?: Array<{ emailId: string; recipient: string; error: string }>;
  isPartial?: boolean;
}

export interface EmailItem {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body?: string;
  attachments?: any[];
  status: EmailStatusType;
  scheduledAt?: string;
  sentAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  isStarred?: boolean;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface EmailListPayload<T = EmailItem> {
  emails: T[];
  pagination: PaginationInfo;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface RecipientChip {
  id: string;
  email: string;
}

export interface AttachmentItem {
  id: string;
  name: string;
  size: string;
  type: string;
}

export interface NavFolder {
  id: 'scheduled' | 'sent';
  name: string;
  count: number;
}

export interface ComposeFormData {
  fromEmail: string;
  recipients: string[];
  subject: string;
  delayBetweenEmails: number;
  hourlyLimit: number;
  body: string;
  scheduledAt?: string;
}
