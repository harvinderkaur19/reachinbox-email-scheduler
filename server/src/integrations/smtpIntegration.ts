import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface EmailAttachmentPayload {
  filename: string;
  content: Buffer | string;
  contentType?: string;
}

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachmentPayload[];
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

let transporterPromise: Promise<Transporter> | null = null;

export const getTransporter = async (): Promise<Transporter> => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      const host = process.env.SMTP_HOST || config.SMTP_HOST || 'smtp.ethereal.email';
      const port = Number(process.env.SMTP_PORT || config.SMTP_PORT || 2525);

      let user = process.env.SMTP_USER || process.env.ETHEREAL_EMAIL || config.SMTP_USER || config.ETHEREAL_EMAIL || '';
      let pass = process.env.SMTP_PASS || process.env.ETHEREAL_PASSWORD || config.SMTP_PASS || config.ETHEREAL_PASSWORD || '';

      const hasCreds = Boolean(user && pass && user.trim() !== '' && pass.trim() !== '');

      console.log(`[SMTP] Provider: Ethereal`);
      console.log(`[SMTP] Host: ${host}, Port: ${port}`);
      console.log(`[SMTP] Credentials configured: ${hasCreds ? 'YES' : 'NO'}`);

      if (!hasCreds) {
        console.log('[SMTP] No static credentials provided in environment. Initializing Ethereal test account...');
        try {
          const testAccount = await nodemailer.createTestAccount();
          user = testAccount.user;
          pass = testAccount.pass;
          console.log(`[SMTP] Ethereal test account created: ${user}`);
        } catch (accErr) {
          console.error('[SMTP] Failed to create Ethereal test account automatically:', (accErr as Error).message);
        }
      }

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
          user: user ? user.trim() : '',
          pass: pass ? pass.trim() : '',
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // Startup SMTP verification
      try {
        await transporter.verify();
        console.log(`[SMTP] Startup verification: Ethereal SMTP connectivity SUCCEEDED (${host}:${port})`);
      } catch (verifyErr) {
        console.error(`[SMTP] Startup verification: Ethereal SMTP connectivity FAILED: ${(verifyErr as Error).message}`);
      }

      return transporter;
    })();
  }
  return transporterPromise;
};

/**
 * Sends an email using Nodemailer via Ethereal SMTP transport.
 *
 * @param options - Object containing from, to, subject, body (text/html) and optional attachments.
 * @param jobId - Optional BullMQ job ID for diagnostic logging.
 * @returns Object containing Nodemailer messageId and Ethereal previewUrl (if applicable).
 */
export const sendEmail = async (options: SendEmailOptions, jobId?: string): Promise<SendEmailResult> => {
  if (jobId) {
    console.log(`[SMTP] Sending email job: ${jobId}`);
  }

  const transporter = await getTransporter();

  const formattedAttachments = options.attachments?.map((att) => ({
    filename: att.filename,
    content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content,
    contentType: att.contentType || 'application/octet-stream',
  }));

  const configuredUser =
    process.env.SMTP_USER ||
    process.env.ETHEREAL_EMAIL ||
    config.SMTP_USER ||
    config.ETHEREAL_EMAIL;

  const mailOptions: any = {
    from: options.from || (configuredUser ? `"${configuredUser}" <${configuredUser}>` : '"ReachInbox Scheduler" <no-reply@reachinbox.ai>'),
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: options.html || `<p>${options.body.replace(/\n/g, '<br/>')}</p>`,
  };

  if (formattedAttachments && formattedAttachments.length > 0) {
    mailOptions.attachments = formattedAttachments;
  }

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  if (previewUrl) {
    console.log(`[SMTP] Ethereal Preview URL: ${previewUrl}`);
  }

  return {
    messageId: info.messageId,
    previewUrl,
  };
};
