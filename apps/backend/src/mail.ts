import { EMAIL_LOGO_PNG_BASE64, LOGO_CID } from './emailLogo';

export const WEB_URL = process.env.WEB_URL ?? 'http://localhost:3000';

// Email is sent through Microsoft Graph, signed in as an Entra ID (Azure AD) app registration (client credentials flow):
// the server asks Entra for an access token with its client secret, then Graph sends the message from the no-reply mailbox.
// Everything secret comes from the server's environment (.env locally, the host's Environment settings in production);
// nothing is written in the code and nothing is ever sent to the browser or the mobile app.
//
// One-time setup in the Microsoft Entra admin center:
//   1. App registrations > New registration. Note the Application (client) ID and Directory (tenant) ID.
//   2. Certificates & secrets > New client secret. Copy the secret VALUE (shown once).
//   3. API permissions > Add > Microsoft Graph > Application permissions > Mail.Send, then "Grant admin consent".
//   4. Have a mailbox for the no-reply address (for example noreply@yourcompany.com) in the same tenant.
//   5. Recommended: limit the app to that one mailbox with an Exchange Online application access policy
//      (New-ApplicationAccessPolicy), so the app cannot send as anyone else.
//
// Environment variables:
//   ENTRA_TENANT_ID, ENTRA_CLIENT_ID, ENTRA_CLIENT_SECRET   the app registration
//   MAIL_SENDER                                             the no-reply mailbox the mail is sent from
//   MAIL_FROM_NAME                                          optional display name (default "Expense Tracker")
// If any of the four required values is missing, emails are printed in the server log instead (local development).

export interface MailConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** The mailbox the mail is sent from, e.g. noreply@yourcompany.com. */
  sender: string;
  senderName: string;
}

type Env = Record<string, string | undefined>;
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

const REQUEST_TIMEOUT_MS = 15_000;
const EMAIL_SHAPE = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

/** Reads the mail settings, or null when they are not all present. */
export function readMailConfig(env: Env = process.env): MailConfig | null {
  const get = (k: string) => env[k]?.trim() ?? '';
  const tenantId = get('ENTRA_TENANT_ID');
  const clientId = get('ENTRA_CLIENT_ID');
  const clientSecret = get('ENTRA_CLIENT_SECRET');
  const sender = get('MAIL_SENDER');
  if (!tenantId || !clientId || !clientSecret || !EMAIL_SHAPE.test(sender)) return null;
  return { tenantId, clientId, clientSecret, sender, senderName: get('MAIL_FROM_NAME') || 'Expense Tracker' };
}

/** Graph and Entra describe errors as { error: { code, message } } (Graph) or { error, error_description } (Entra). */
function describeError(body: unknown): string {
  if (!body || typeof body !== 'object') return 'no details';
  const b = body as { error?: unknown; error_description?: unknown };
  if (typeof b.error === 'string') return `${b.error}${typeof b.error_description === 'string' ? `: ${b.error_description.split('\r\n')[0]}` : ''}`;
  if (b.error && typeof b.error === 'object') {
    const e = b.error as { code?: unknown; message?: unknown };
    return `${String(e.code ?? 'error')}: ${String(e.message ?? '')}`;
  }
  return 'no details';
}

export interface Mailer {
  provider: 'entra' | 'log';
  /** Resolves true only if Microsoft accepted the message; never throws, because a mail problem must not break the request that triggered it. */
  send(to: string, subject: string, text: string, html?: string): Promise<boolean>;
}

export function createMailer(config: MailConfig | null, fetchImpl: FetchLike = (u, i) => fetch(u, i), now: () => number = Date.now): Mailer {
  if (!config) {
    return {
      provider: 'log',
      async send(to, subject, text) {
        console.log(`\n[mail - not sent, Entra mail is not configured]\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
        return false;
      },
    };
  }

  let token: { value: string; expiresAt: number } | null = null;
  let pending: Promise<string> | null = null;

  async function fetchToken(): Promise<string> {
    const res = await fetchImpl(`https://login.microsoftonline.com/${encodeURIComponent(config!.tenantId)}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config!.clientId,
        client_secret: config!.clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = (await res.json().catch(() => null)) as { access_token?: string; expires_in?: number } | null;
    if (!res.ok || !body?.access_token) throw new Error(`token request failed (${res.status}): ${describeError(body)}`);
    // Refresh a minute early so a token never expires in flight.
    token = { value: body.access_token, expiresAt: now() + Math.max(60, body.expires_in ?? 3600) * 1000 - 60_000 };
    return token.value;
  }

  /** A valid token, reused until shortly before it expires; simultaneous callers share one request. */
  async function getToken(force = false): Promise<string> {
    if (!force && token && token.expiresAt > now()) return token.value;
    pending ??= fetchToken().finally(() => {
      pending = null;
    });
    return pending;
  }

  async function post(accessToken: string, payload: unknown) {
    return fetchImpl(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config!.sender)}/sendMail`, {
      method: 'POST',
      headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  }

  return {
    provider: 'entra',
    async send(to, subject, text, html) {
      try {
        if (!EMAIL_SHAPE.test(to)) {
          console.error('[mail] not sent: the recipient is not a valid email address');
          return false;
        }
        // The logo travels inside the email (an inline attachment) when the HTML refers to it as cid:..., so it shows even
        // when the reader's mail app blocks remote images. Nothing else about the message changes.
        const attachments =
          html && html.includes(`cid:${LOGO_CID}`)
            ? [
                {
                  '@odata.type': '#microsoft.graph.fileAttachment',
                  name: 'expense-tracker-logo.png',
                  contentType: 'image/png',
                  contentBytes: EMAIL_LOGO_PNG_BASE64,
                  contentId: LOGO_CID,
                  isInline: true,
                },
              ]
            : undefined;
        const payload = {
          message: {
            subject,
            body: { contentType: html ? 'HTML' : 'Text', content: html ?? text },
            toRecipients: [{ emailAddress: { address: to } }],
            from: { emailAddress: { address: config.sender, name: config.senderName } },
            ...(attachments ? { attachments } : {}),
          },
          saveToSentItems: false,
        };
        let res = await post(await getToken(), payload);
        if (res.status === 401) res = await post(await getToken(true), payload); // the token was revoked or expired early: get a new one once
        if (res.status === 202) {
          console.log(`[mail] accepted "${subject}" for ${to}`);
          return true;
        }
        const body = await res.json().catch(() => null);
        console.error(`[mail] Microsoft Graph refused "${subject}" for ${to} (${res.status}): ${describeError(body)}`);
        return false;
      } catch (e) {
        // Never include the secret or token: only the reason.
        console.error('[mail] sending failed:', e instanceof Error ? e.message : e);
        return false;
      }
    },
  };
}

const config = readMailConfig();
const mailer = createMailer(config);

export const mailProvider: 'entra' | 'log' = mailer.provider;
console.log(`[mail] provider: ${mailProvider}${config ? ` (sending as ${config.sender})` : ' (set ENTRA_* and MAIL_SENDER to send real email)'}`);

/** Sends one email as the no-reply mailbox. Resolves true only if Microsoft accepted it; never throws. */
export const sendMail = (to: string, subject: string, text: string, html?: string) => mailer.send(to, subject, text, html);
