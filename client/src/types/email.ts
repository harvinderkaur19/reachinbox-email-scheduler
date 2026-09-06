export type EmailStatusType = 'SCHEDULED' | 'SENT' | 'FAILED' | 'PROCESSING';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface EmailItem {
  id: string;
  campaignId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  status: EmailStatusType;
  scheduledAt: string;
  sentAt?: string | null;
  failureReason?: string | null;
  createdAt: string;
  isStarred?: boolean;
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
