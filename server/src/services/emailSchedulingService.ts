import { getPrismaClient } from '../utils/prisma';
import { scheduleEmailJob } from './schedulerService';
import { indexEmails } from './elasticsearchService';
import { ScheduleEmailInput } from '../utils/validation/emailValidation';
import { ScheduleCampaignResponse, ScheduledEmailItem, QueueFailureItem } from '../types';

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
 * Orchestrates campaign creation, email persistence, BullMQ job scheduling, and Elasticsearch indexing.
 *
 * @param userId - ID of the authenticated/development user.
 * @param input - Validated schedule request DTO.
 * @returns Structured result containing campaignId, scheduledCount, queuedCount, emails, queueFailures, and indexingStatus.
 */
export const scheduleCampaignService = async (
  userId: string,
  input: ScheduleEmailInput
): Promise<ScheduleCampaignResponse> => {
  const prisma = getPrismaClient();

  // 1. Verify SenderAccount
  const senderAccount = await prisma.senderAccount.findUnique({
    where: { id: input.senderAccountId },
  });

  if (!senderAccount || senderAccount.userId !== userId) {
    throw new ServiceError('Sender account not found or does not belong to the user', 404);
  }

  if (!senderAccount.isActive) {
    throw new ServiceError('Selected sender account is inactive', 400);
  }

  const startMs = new Date(input.startTime).getTime();

  // 2. Perform Atomic Database Transaction (Campaign + Email records)
  const { campaign, createdEmails } = await prisma.$transaction(async (tx) => {
    const newCampaign = await tx.campaign.create({
      data: {
        userId,
        subject: input.subject,
        body: input.body,
        startTime: new Date(input.startTime),
        delayBetweenEmails: input.delayBetweenEmails,
        hourlyLimit: input.hourlyLimit,
        status: 'SCHEDULED',
      },
    });

    const hasAttachments = Array.isArray(input.attachments) && input.attachments.length > 0;
    const finalBody = hasAttachments
      ? `${input.body}\n\n<!--ATTACHMENTS:${JSON.stringify(input.attachments)}-->`
      : input.body;

    const emailsToCreate = input.recipients.map((recipient, index) => {
      // Server-side calculation: startTime + index * delayBetweenEmails (in seconds)
      const scheduledTimeMs = startMs + index * input.delayBetweenEmails * 1000;
      return {
        campaignId: newCampaign.id,
        senderAccountId: senderAccount.id,
        recipientEmail: recipient,
        subject: input.subject,
        body: finalBody,
        scheduledAt: new Date(scheduledTimeMs),
        status: 'SCHEDULED' as const,
        idempotencyKey: `email-${newCampaign.id}-${recipient}-${index}`,
        attemptCount: 0,
      };
    });


    // Create Email records in database
    await tx.email.createMany({
      data: emailsToCreate,
    });

    const emails = await tx.email.findMany({
      where: { campaignId: newCampaign.id },
      orderBy: { scheduledAt: 'asc' },
    });

    return { campaign: newCampaign, createdEmails: emails };
  });

  // 3. Enqueue BullMQ delayed jobs after DB transaction succeeds
  const scheduledEmails: ScheduledEmailItem[] = [];
  const queueFailures: QueueFailureItem[] = [];

  for (const email of createdEmails) {
    try {
      const job = await scheduleEmailJob(email.id, email.scheduledAt);
      scheduledEmails.push({
        emailId: email.id,
        recipient: email.recipientEmail,
        scheduledAt: email.scheduledAt,
        status: email.status,
        jobId: job.id,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(
        `[EmailSchedulingService] Queue scheduling failed for email ${email.id} (recipient: ${email.recipientEmail}):`,
        errorMsg
      );
      queueFailures.push({
        emailId: email.id,
        recipient: email.recipientEmail,
        error: errorMsg,
      });
    }
  }

  // 4. Index created Emails into Elasticsearch (non-fatal, post-transaction)
  const indexingStatus = await indexEmails(createdEmails, userId);

  return {
    campaignId: campaign.id,
    scheduledCount: createdEmails.length,
    queuedCount: scheduledEmails.length,
    scheduledEmails,
    queueFailures: queueFailures.length > 0 ? queueFailures : undefined,
    indexingStatus,
  };
};

/**
 * Updates an existing scheduled email record, preserving existing attachments if not explicitly replaced,
 * and re-queues the updated BullMQ job.
 */
export const updateScheduledEmailService = async (
  userId: string,
  emailId: string,
  input: {
    subject?: string;
    body?: string;
    recipientEmail?: string;
    scheduledAt?: string;
    attachments?: Array<{ filename: string; contentType?: string; content: string }>;
  }
) => {
  const prisma = getPrismaClient();

  const email = await prisma.email.findUnique({
    where: { id: emailId },
    include: { campaign: true },
  });

  if (!email || email.campaign.userId !== userId) {
    throw new ServiceError('Scheduled email record not found or unauthorized', 404);
  }

  if (email.status === 'SENT' || email.status === 'PROCESSING') {
    throw new ServiceError('Cannot edit an email that is currently being processed or already sent', 400);
  }

  let finalBody = email.body;

  // Handle body update & attachment preservation rules
  if (input.body !== undefined || input.attachments !== undefined) {
    // Determine existing attachments if input.attachments is not explicitly provided
    let currentAttachments: any[] = [];
    const existingMatch = email.body.match(/<!--ATTACHMENTS:(.*?)-->$/s);
    const cleanTextBody = email.body.replace(/<!--ATTACHMENTS:(.*?)-->$/s, '').trim();

    if (existingMatch && existingMatch[1]) {
      try {
        currentAttachments = JSON.parse(existingMatch[1]);
      } catch (err) {}
    }

    const textToUse = input.body !== undefined ? input.body.trim() : cleanTextBody;
    const attachmentsToUse = input.attachments !== undefined ? input.attachments : currentAttachments;

    finalBody = attachmentsToUse && attachmentsToUse.length > 0
      ? `${textToUse}\n\n<!--ATTACHMENTS:${JSON.stringify(attachmentsToUse)}-->`
      : textToUse;
  }

  const updatedScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : email.scheduledAt;

  // Update MySQL record
  const updatedEmail = await prisma.email.update({
    where: { id: emailId },
    data: {
      subject: input.subject !== undefined ? input.subject.trim() : email.subject,
      body: finalBody,
      recipientEmail: input.recipientEmail !== undefined ? input.recipientEmail.trim() : email.recipientEmail,
      scheduledAt: updatedScheduledAt,
      status: 'SCHEDULED',
      failureReason: null,
    },
  });

  console.log(`[SCHEDULE] Campaign updated in database for email ID ${emailId}`);

  // Re-queue updated job
  const job = await scheduleEmailJob(emailId, updatedScheduledAt);
  console.log(`[SCHEDULE] Job ID ${job.id} re-queued for scheduled timestamp ${updatedScheduledAt.toISOString()}`);

  return updatedEmail;
};

