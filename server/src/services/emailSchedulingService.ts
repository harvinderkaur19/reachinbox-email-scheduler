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
  console.log(`[SCHEDULE-TRACE] Request received in scheduleCampaignService for user: ${userId}`);
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
  console.log(`[SCHEDULE-TRACE] Parsed scheduled time: ${new Date(startMs).toISOString()} (${startMs}ms)`);

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
    const attachmentsJson = hasAttachments ? (input.attachments as any) : null;

    const emailsToCreate = input.recipients.map((recipient, index) => {
      const scheduledTimeMs = startMs + index * input.delayBetweenEmails * 1000;
      return {
        campaignId: newCampaign.id,
        senderAccountId: senderAccount.id,
        recipientEmail: recipient,
        subject: input.subject,
        body: input.body,
        attachments: attachmentsJson,
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

  console.log(`[SCHEDULE-TRACE] Email saved to DB (Count: ${createdEmails.length}, Campaign ID: ${campaign.id})`);

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
        `[SCHEDULE-TRACE] Queue scheduling failed for email ${email.id} (recipient: ${email.recipientEmail}):`,
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
  console.log(`[SCHEDULE-TRACE] Update request received for email ID: ${emailId}`);
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

  // Preserve fields not explicitly provided in update request
  const updatedSubject = input.subject !== undefined && input.subject !== null ? input.subject.trim() : email.subject;
  const updatedBody = input.body !== undefined && input.body !== null ? input.body.trim() : email.body;
  const updatedRecipientEmail =
    input.recipientEmail !== undefined && input.recipientEmail !== null
      ? input.recipientEmail.trim()
      : email.recipientEmail;
  const updatedScheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : email.scheduledAt;

  // Handle attachment preservation
  let updatedAttachmentsJson: any = email.attachments;
  if (input.attachments !== undefined) {
    updatedAttachmentsJson = Array.isArray(input.attachments) && input.attachments.length > 0 ? input.attachments : null;
  }

  // Update MySQL record
  const updatedEmail = await prisma.email.update({
    where: { id: emailId },
    data: {
      subject: updatedSubject,
      body: updatedBody,
      recipientEmail: updatedRecipientEmail,
      attachments: updatedAttachmentsJson,
      scheduledAt: updatedScheduledAt,
      status: 'SCHEDULED',
      failureReason: null,
    },
  });

  console.log(`[SCHEDULE-TRACE] Email saved to DB for email ID ${emailId} (Subject: "${updatedSubject}")`);

  // Re-queue updated job
  const job = await scheduleEmailJob(emailId, updatedScheduledAt);
  console.log(`[SCHEDULE-TRACE] Job ID ${job.id} re-queued for scheduled timestamp ${updatedScheduledAt.toISOString()}`);

  return updatedEmail;
};

