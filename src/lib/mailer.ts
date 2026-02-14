import nodemailer from 'nodemailer';
import { execSync } from 'child_process';

let cachedPassword: string | null = null;

function getSmtpPassword(): string {
  // First check env var
  if (process.env.SMTP_PASS) {
    return process.env.SMTP_PASS;
  }

  // Cache the keychain lookup
  if (cachedPassword) {
    return cachedPassword;
  }

  // Fallback: read from macOS Keychain (local dev only)
  try {
    const password = execSync(
      'security find-generic-password -s "smtp-password" -a "clawdbot" -w',
      { encoding: 'utf-8', timeout: 5000 }
    ).trim();
    cachedPassword = password;
    return password;
  } catch {
    throw new Error(
      'SMTP_PASS not set and macOS Keychain lookup failed. ' +
      'Set SMTP_PASS env var or add the password to Keychain.'
    );
  }
}

// Lazy-initialized pooled transport
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;

  const smtpUser = process.env.SMTP_USER || 'josh@joshlevylabs.com';
  const smtpPass = getSmtpPassword();

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  return transporter;
}

export interface SendNewsletterOptions {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  senderName: string;
  replyTo?: string;
  unsubscribeUrl?: string;
}

export async function sendNewsletter(options: SendNewsletterOptions): Promise<void> {
  const { to, toName, subject, html, senderName, replyTo, unsubscribeUrl } = options;
  const smtpUser = process.env.SMTP_USER || 'josh@joshlevylabs.com';
  const transport = getTransporter();

  const headers: Record<string, string> = {};
  if (unsubscribeUrl) {
    headers['List-Unsubscribe'] = `<${unsubscribeUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const toAddress = toName ? `"${toName}" <${to}>` : to;

  await transport.sendMail({
    from: `"${senderName}" <${smtpUser}>`,
    to: toAddress,
    replyTo: replyTo || smtpUser,
    subject,
    html,
    headers,
  });
}

/**
 * Close the pooled SMTP connection (call when done with a batch).
 */
export function closeMailer(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
