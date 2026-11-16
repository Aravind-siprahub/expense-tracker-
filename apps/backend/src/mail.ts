import nodemailer from 'nodemailer';

export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

// Which provider sends mail (first match wins):
//   1. SMTP  - set SMTP_USER + SMTP_PASS (Gmail: smtp.gmail.com with an App Password)
//   2. Resend - set RESEND_API_KEY
//   3. Neither - emails are printed in the server log (local development)
const SMTP_USER = process.env.SMTP_USER?.trim();
const SMTP_PASS = process.env.SMTP_PASS?.replace(/\s+/g, ''); // Google shows app passwords with spaces
const SMTP_HOST = process.env.SMTP_HOST?.trim() || (SMTP_USER ? 'smtp.gmail.com' : undefined);
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_SECURE = process.env.SMTP_SECURE ? process.env.SMTP_SECURE === 'true' : SMTP_PORT === 465;
const RESEND_KEY = process.env.RESEND_API_KEY?.trim();

// Gmail only sends as the signed-in address, so From defaults to SMTP_USER.
const FROM =
  process.env.MAIL_FROM?.trim() ||
  (SMTP_USER ? `Family Expense Tracker <${SMTP_USER}>` : 'Family Expense Tracker <onboarding@resend.dev>');

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_SECURE,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      })
    : null;

export const mailProvider: 'smtp' | 'resend' | 'log' = transporter ? 'smtp' : RESEND_KEY ? 'resend' : 'log';
console.log(`[mail] provider: ${mailProvider}${transporter ? ` (${SMTP_HOST}:${SMTP_PORT} as ${SMTP_USER})` : ''}`);

/**
 * Sends a plain-text email. Resolves true only if the provider accepted it; never throws,
 * because a mail problem must not break the request that triggered it. Without a provider
 * (local development) the email is printed to the server log and false is returned.
 */
export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  try {
    if (transporter) {
      const info = await transporter.sendMail({ from: FROM, to, subject, text, html });
      const accepted = info.accepted.length > 0 && info.rejected.length === 0;
      // The SMTP server only says it accepted the message. Whether it reaches the inbox is
      // decided later, so keep the details to help diagnose "they didn't get it" reports.
      console.log(
        `[mail] ${accepted ? 'accepted' : 'REJECTED'} "${subject}" for ${to} ` +
          `(response: ${info.response}; accepted: ${info.accepted.join(',') || '-'}; rejected: ${info.rejected.join(',') || '-'})`,
      );
      return accepted;
    }
    if (RESEND_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from: FROM, to: [to], subject, text, ...(html ? { html } : {}) }),
      });
      if (!res.ok) console.error('[mail] Resend failed', res.status, await res.text());
      return res.ok;
    }
    console.log(`\n[mail - not sent, no mail provider configured]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return false;
  } catch (e) {
    console.error('[mail] sending failed:', e instanceof Error ? e.message : e);
    return false;
  }
}
