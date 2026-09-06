import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';

export interface SendEmailOptions {
  from?: string;
  to: string;
  subject: string;
  body: string;
  html?: string;
}

export interface SendEmailResult {
  messageId: string;
  previewUrl: string | false;
}

let transporterPromise: Promise<Transporter> | null = null;

const getTransporter = async (): Promise<Transporter> => {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      let user = config.SMTP_USER;
      let pass = config.SMTP_PASS;

      // If credentials are blank, create an Ethereal test account automatically
      if (!user || !pass) {
        console.log('[SMTP Integration] No static credentials provided. Creating Ethereal test account...');
        const testAccount = await nodemailer.createTestAccount();
        user = testAccount.user;
        pass = testAccount.pass;
        console.log(`[SMTP Integration] Ethereal test account initialized: ${user}`);
      }

      return nodemailer.createTransport({
        host: config.SMTP_HOST || 'smtp.ethereal.email',
        port: config.SMTP_PORT || 587,
        secure: config.SMTP_SECURE || false,
        auth: {
          user,
          pass,
        },
      });
    })();
  }
  return transporterPromise;
};

/**
 * Sends an email using Nodemailer via Ethereal SMTP transport.
 *
 * @param options - Object containing from, to, subject, body (text/html).
 * @returns Object containing Nodemailer messageId and Ethereal previewUrl (if applicable).
 */
export const sendEmail = async (options: SendEmailOptions): Promise<SendEmailResult> => {
  const transporter = await getTransporter();

  const mailOptions = {
    from: options.from || '"ReachInbox Email Scheduler" <no-reply@reachinbox.ai>',
    to: options.to,
    subject: options.subject,
    text: options.body,
    html: options.html || `<p>${options.body.replace(/\n/g, '<br/>')}</p>`,
  };

  const info = await transporter.sendMail(mailOptions);
  const previewUrl = nodemailer.getTestMessageUrl(info);

  return {
    messageId: info.messageId,
    previewUrl,
  };
};
