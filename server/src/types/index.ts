// Placeholder type definitions for server application
export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface EmailJobData {
  emailId: string;
}

export const EMAIL_SCHEDULER_QUEUE_NAME = 'email-scheduler';
