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

interface TransportConfig {
  host: string;
  port: number;
  secure: boolean;
  name: string;
}

/**
 * Validates or dynamically generates Ethereal SMTP credentials.
 */
const getEtherealCredentials = async (): Promise<{ user: string; pass: string }> => {
  let user = process.env.SMTP_USER || process.env.ETHEREAL_EMAIL || config.SMTP_USER || config.ETHEREAL_EMAIL || '';
  let pass = process.env.SMTP_PASS || process.env.ETHEREAL_PASSWORD || config.SMTP_PASS || config.ETHEREAL_PASSWORD || '';

  const hasCreds = Boolean(user && pass && user.trim() !== '' && pass.trim() !== '');

  if (!hasCreds) {
    console.log('[SMTP] No static credentials in environment. Creating Ethereal test account via nodemailer.createTestAccount()...');
    try {
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      console.log(`[SMTP] Dynamic Ethereal test account created: ${user}`);
    } catch (accErr) {
      console.error('[SMTP] Failed to create dynamic Ethereal test account:', accErr);
    }
  } else {
    console.log(`[SMTP] Using configured credentials for user: ${user.trim()}`);
  }

  return { user: user ? user.trim() : '', pass: pass ? pass.trim() : '' };
};

/**
 * Creates a Nodemailer transport instance with explicit connection timeouts.
 */
const createCustomTransport = (cfg: TransportConfig, creds: { user: string; pass: string }): Transporter => {
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: creds.user,
      pass: creds.pass,
    },
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 10000,
    dnsTimeout: 5000,
  });
};

/**
 * Performs startup verification testing Ethereal ports until connectivity succeeds.
 */
export const verifySmtpConnectionOnStartup = async (): Promise<boolean> => {
  const creds = await getEtherealCredentials();
  const envHost = process.env.SMTP_HOST || config.SMTP_HOST || 'smtp.ethereal.email';
  const envPort = Number(process.env.SMTP_PORT || config.SMTP_PORT || 2525);

  const configsToTry: TransportConfig[] = [
    { host: envHost, port: envPort, secure: envPort === 465, name: `Primary (${envHost}:${envPort})` },
    { host: 'smtp.ethereal.email', port: 2525, secure: false, name: 'Ethereal Alt 2525' },
    { host: 'smtp.ethereal.email', port: 587, secure: false, name: 'Ethereal Standard 587' },
    { host: 'smtp.ethereal.email', port: 465, secure: true, name: 'Ethereal SSL 465' },
  ];

  console.log(`[SMTP] Provider: Ethereal`);
  console.log(`[SMTP] Host: ${envHost}, Port: ${envPort}`);
  console.log(`[SMTP] Credentials configured: ${creds.user ? 'YES' : 'NO'}`);

  for (const cfg of configsToTry) {
    try {
      const transporter = createCustomTransport(cfg, creds);
      await transporter.verify();
      console.log(`[SMTP] Startup verification: Connectivity SUCCEEDED via ${cfg.name}`);
      return true;
    } catch (vErr: any) {
      console.warn(`[SMTP] Startup verification attempt failed via ${cfg.name}: Code=${vErr?.code || 'N/A'}, Message=${vErr?.message || String(vErr)}`);
    }
  }

  console.error('[SMTP] Startup verification: All connection attempts failed.');
  return false;
};

/**
 * Legacy export wrapper to maintain backward compatibility with server.ts.
 */
export const getTransporter = async (): Promise<Transporter> => {
  const creds = await getEtherealCredentials();
  const envHost = process.env.SMTP_HOST || config.SMTP_HOST || 'smtp.ethereal.email';
  const envPort = Number(process.env.SMTP_PORT || config.SMTP_PORT || 2525);
  return createCustomTransport(
    { host: envHost, port: envPort, secure: envPort === 465, name: `Primary (${envHost}:${envPort})` },
    creds
  );
};

/**
 * Sends an email trying primary and alternative Ethereal transport configurations if primary fails.
 */
export const sendEmail = async (options: SendEmailOptions, jobId?: string): Promise<SendEmailResult> => {
  if (jobId) {
    console.log(`[SMTP] Sending email job: ${jobId}`);
  }

  const creds = await getEtherealCredentials();
  const envHost = process.env.SMTP_HOST || config.SMTP_HOST || 'smtp.ethereal.email';
  const envPort = Number(process.env.SMTP_PORT || config.SMTP_PORT || 2525);

  const configsToTry: TransportConfig[] = [
    { host: envHost, port: envPort, secure: envPort === 465, name: `Primary (${envHost}:${envPort})` },
    { host: 'smtp.ethereal.email', port: 2525, secure: false, name: 'Ethereal Alt 2525' },
    { host: 'smtp.ethereal.email', port: 587, secure: false, name: 'Ethereal Standard 587' },
    { host: 'smtp.ethereal.email', port: 465, secure: true, name: 'Ethereal SSL 465' },
  ];

  const formattedAttachments = options.attachments?.map((att) => ({
    filename: att.filename,
    content: typeof att.content === 'string' ? Buffer.from(att.content, 'base64') : att.content,
    contentType: att.contentType || 'application/octet-stream',
  }));

  const configuredUser = creds.user;
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

  let lastError: any = null;

  for (const cfg of configsToTry) {
    try {
      console.log(`[SMTP] Attempting dispatch via ${cfg.name}...`);
      const transporter = createCustomTransport(cfg, creds);
      const info = await transporter.sendMail(mailOptions);
      const previewUrl = nodemailer.getTestMessageUrl(info);

      console.log(`[SMTP] Message accepted by Nodemailer via ${cfg.name}! MessageId: ${info.messageId}`);
      if (previewUrl) {
        console.log(`[SMTP] Ethereal Preview URL: ${previewUrl}`);
      }

      return {
        messageId: info.messageId,
        previewUrl,
      };
    } catch (sendErr: any) {
      lastError = sendErr;
      console.error(`⚠️ [SMTP-ERROR-TRACE] Dispatch failed via ${cfg.name}:`);
      console.error(`   Message: ${sendErr?.message || String(sendErr)}`);
      console.error(`   Code: ${sendErr?.code || 'N/A'}`);
      console.error(`   Command: ${sendErr?.command || 'N/A'}`);
      console.error(`   Address: ${sendErr?.address || 'N/A'}:${sendErr?.port || 'N/A'}`);
      try {
        console.error(`   Full Error Details: ${JSON.stringify(sendErr, Object.getOwnPropertyNames(sendErr))}`);
      } catch (jErr) {
        console.error(`   Full Error Object:`, sendErr);
      }
    }
  }

  const errorMsg = lastError instanceof Error ? lastError.message : String(lastError);
  console.error(`❌ [SMTP] All Ethereal transport attempts failed for job ${jobId || 'N/A'}: ${errorMsg}`);
  throw lastError || new Error('All Ethereal SMTP connection attempts failed');
};
