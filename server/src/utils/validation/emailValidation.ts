import { z } from 'zod';

export const scheduleEmailSchema = z.object({
  senderAccountId: z
    .string({ required_error: 'senderAccountId is required' })
    .min(1, 'senderAccountId cannot be empty'),
  subject: z
    .string({ required_error: 'subject is required' })
    .min(1, 'subject cannot be empty'),
  body: z
    .string({ required_error: 'body is required' })
    .min(1, 'body cannot be empty'),
  recipients: z
    .array(z.string().trim().toLowerCase().email('Invalid recipient email format'), {
      required_error: 'recipients is required',
    })
    .min(1, 'recipients array must contain at least one email address')
    .transform((emails) => Array.from(new Set(emails))),
  startTime: z
    .string({ required_error: 'startTime is required' })
    .refine((val) => !isNaN(Date.parse(val)), { message: 'startTime must be a valid datetime string' })
    .refine((val) => new Date(val).getTime() > Date.now(), { message: 'startTime must be in the future' }),
  delayBetweenEmails: z
    .number({ required_error: 'delayBetweenEmails is required' })
    .int('delayBetweenEmails must be an integer')
    .min(0, 'delayBetweenEmails cannot be negative'),
  hourlyLimit: z
    .number({ required_error: 'hourlyLimit is required' })
    .int('hourlyLimit must be an integer')
    .min(1, 'hourlyLimit must be a positive integer'),
});

export type ScheduleEmailInput = z.infer<typeof scheduleEmailSchema>;
