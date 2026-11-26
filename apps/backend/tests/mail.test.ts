import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { createMailer, readMailConfig, type MailConfig } from '../src/mail';

// The mail code talks to Microsoft through an injected fetch, so no real request is ever made here.
const CONFIG: MailConfig = {
  tenantId: 'tenant-123',
  clientId: 'client-456',
  clientSecret: 'SUPER-SECRET-VALUE',
  sender: 'noreply@example.test',
  senderName: 'Expense Tracker',
};

type Call = { url: string; init: RequestInit };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const empty202 = () => new Response(null, { status: 202 });

function fakeMicrosoft(opts: { sendStatus?: number | number[]; tokenStatus?: number } = {}) {
  const calls: Call[] = [];
  const sendStatuses = Array.isArray(opts.sendStatus) ? [...opts.sendStatus] : [opts.sendStatus ?? 202];
  let tokenCount = 0;
  const fetchImpl = async (url: string, init: RequestInit = {}) => {
    calls.push({ url, init });
    if (url.startsWith('https://login.microsoftonline.com/')) {
      tokenCount += 1;
      if ((opts.tokenStatus ?? 200) !== 200) return json(opts.tokenStatus!, { error: 'invalid_client', error_description: 'AADSTS7000215: Invalid client secret provided.\r\nTrace ID: x' });
      return json(200, { access_token: `TOKEN-${tokenCount}`, expires_in: 3600, token_type: 'Bearer' });
    }
    const status = sendStatuses.length > 1 ? sendStatuses.shift()! : sendStatuses[0];
    if (status === 202) return empty202();
    return json(status, { error: { code: status === 403 ? 'ErrorAccessDenied' : 'Failure', message: 'Access is denied.' } });
  };
  return { fetchImpl, calls, tokens: () => tokenCount, sends: () => calls.filter((c) => c.url.includes('/sendMail')) };
}

let logs: string[];
beforeEach(() => {
  logs = [];
  mock.method(console, 'log', (...a: unknown[]) => logs.push(a.join(' ')));
  mock.method(console, 'error', (...a: unknown[]) => logs.push(a.join(' ')));
});
afterEach(() => mock.restoreAll());

describe('mail settings', () => {
  const full = { ENTRA_TENANT_ID: ' t ', ENTRA_CLIENT_ID: 'c', ENTRA_CLIENT_SECRET: 's', MAIL_SENDER: 'noreply@example.test' };

  it('reads all four required values (trimmed) and defaults the display name', () => {
    const c = readMailConfig(full)!;
    assert.equal(c.tenantId, 't');
    assert.equal(c.senderName, 'Expense Tracker');
    assert.equal(readMailConfig({ ...full, MAIL_FROM_NAME: 'Acme Help' })!.senderName, 'Acme Help');
  });

  it('is not configured when any required value is missing or the sender is not an email address', () => {
    for (const k of Object.keys(full)) assert.equal(readMailConfig({ ...full, [k]: '' }), null, k);
    assert.equal(readMailConfig({ ...full, MAIL_SENDER: 'not-an-email' }), null);
    assert.equal(readMailConfig({}), null);
  });
});

describe('sending through Microsoft Graph', () => {
  it('without settings, nothing is sent: the email is only printed in the log', async () => {
    const ms = fakeMicrosoft();
    const mailer = createMailer(null, ms.fetchImpl);
    assert.equal(mailer.provider, 'log');
    assert.equal(await mailer.send('a@example.test', 'Subject', 'Body text'), false);
    assert.equal(ms.calls.length, 0);
    assert.ok(logs.some((l) => l.includes('Body text')));
  });

  it('asks Entra for an app-only token, then sends from the no-reply mailbox', async () => {
    const ms = fakeMicrosoft();
    const mailer = createMailer(CONFIG, ms.fetchImpl);
    assert.equal(mailer.provider, 'entra');
    assert.equal(await mailer.send('priya@example.test', 'Reset your password', 'plain', '<p>html</p>'), true);

    const token = ms.calls[0];
    assert.equal(token.url, 'https://login.microsoftonline.com/tenant-123/oauth2/v2.0/token');
    const form = new URLSearchParams(String(token.init.body));
    assert.equal(form.get('grant_type'), 'client_credentials');
    assert.equal(form.get('scope'), 'https://graph.microsoft.com/.default');
    assert.equal(form.get('client_id'), 'client-456');
    assert.equal(form.get('client_secret'), 'SUPER-SECRET-VALUE');

    const send = ms.sends()[0];
    assert.equal(send.url, 'https://graph.microsoft.com/v1.0/users/noreply%40example.test/sendMail');
    assert.equal((send.init.headers as Record<string, string>).authorization, 'Bearer TOKEN-1');
    const body = JSON.parse(String(send.init.body));
    assert.equal(body.message.subject, 'Reset your password');
    assert.deepEqual(body.message.body, { contentType: 'HTML', content: '<p>html</p>' });
    assert.deepEqual(body.message.toRecipients, [{ emailAddress: { address: 'priya@example.test' } }]);
    assert.deepEqual(body.message.from, { emailAddress: { address: 'noreply@example.test', name: 'Expense Tracker' } });
    assert.equal(body.saveToSentItems, false);
  });

  it('attaches the logo inline when the HTML refers to it (cid), and attaches nothing otherwise', async () => {
    const ms = fakeMicrosoft();
    const mailer = createMailer(CONFIG, ms.fetchImpl);
    await mailer.send('a@example.test', 'S', 't', '<img src="cid:expense-tracker-logo" alt="logo">');
    const withLogo = JSON.parse(String(ms.sends()[0].init.body)).message;
    assert.equal(withLogo.attachments.length, 1);
    const att = withLogo.attachments[0];
    assert.equal(att['@odata.type'], '#microsoft.graph.fileAttachment');
    assert.equal(att.contentId, 'expense-tracker-logo');
    assert.equal(att.isInline, true);
    assert.equal(att.contentType, 'image/png');
    assert.equal(Buffer.from(att.contentBytes, 'base64').subarray(1, 4).toString(), 'PNG');

    await mailer.send('a@example.test', 'S', 't', '<p>no logo here</p>');
    assert.equal('attachments' in JSON.parse(String(ms.sends()[1].init.body)).message, false);
  });

  it('sends plain text when there is no HTML version', async () => {
    const ms = fakeMicrosoft();
    await createMailer(CONFIG, ms.fetchImpl).send('a@example.test', 'S', 'just text');
    assert.deepEqual(JSON.parse(String(ms.sends()[0].init.body)).message.body, { contentType: 'Text', content: 'just text' });
  });

  it('reuses the token until it is about to expire, then asks for a new one', async () => {
    const ms = fakeMicrosoft();
    let clock = 1_000_000;
    const mailer = createMailer(CONFIG, ms.fetchImpl, () => clock);
    await mailer.send('a@example.test', 'S', 't');
    await mailer.send('b@example.test', 'S', 't');
    assert.equal(ms.tokens(), 1, 'second send reuses the token');
    clock += 3600 * 1000; // an hour later: expired
    await mailer.send('c@example.test', 'S', 't');
    assert.equal(ms.tokens(), 2);
  });

  it('simultaneous sends share one token request', async () => {
    const ms = fakeMicrosoft();
    const mailer = createMailer(CONFIG, ms.fetchImpl);
    const results = await Promise.all([1, 2, 3, 4].map((i) => mailer.send(`u${i}@example.test`, 'S', 't')));
    assert.deepEqual(results, [true, true, true, true]);
    assert.equal(ms.tokens(), 1);
  });

  it('gets a fresh token once if Microsoft answers 401, then succeeds', async () => {
    const ms = fakeMicrosoft({ sendStatus: [401, 202] });
    assert.equal(await createMailer(CONFIG, ms.fetchImpl).send('a@example.test', 'S', 't'), true);
    assert.equal(ms.tokens(), 2);
    assert.equal((ms.sends()[1].init.headers as Record<string, string>).authorization, 'Bearer TOKEN-2');
  });

  it('returns false (never throws) when Graph refuses, and logs the reason without any secret', async () => {
    const ms = fakeMicrosoft({ sendStatus: 403 });
    assert.equal(await createMailer(CONFIG, ms.fetchImpl).send('a@example.test', 'S', 't'), false);
    const text = logs.join('\n');
    assert.match(text, /403/);
    assert.match(text, /ErrorAccessDenied/);
    assert.ok(!text.includes('SUPER-SECRET-VALUE') && !text.includes('TOKEN-1'));
  });

  it('returns false when the sign-in to Entra fails (wrong secret), and never logs the secret', async () => {
    const ms = fakeMicrosoft({ tokenStatus: 401 });
    assert.equal(await createMailer(CONFIG, ms.fetchImpl).send('a@example.test', 'S', 't'), false);
    const text = logs.join('\n');
    assert.match(text, /invalid_client/);
    assert.ok(!text.includes('SUPER-SECRET-VALUE'));
    assert.equal(ms.sends().length, 0);
  });

  it('returns false when the network fails or times out', async () => {
    const mailer = createMailer(CONFIG, async () => {
      throw new Error('network down');
    });
    assert.equal(await mailer.send('a@example.test', 'S', 't'), false);
  });

  it('does not call Microsoft for an invalid recipient', async () => {
    const ms = fakeMicrosoft();
    assert.equal(await createMailer(CONFIG, ms.fetchImpl).send('not an email', 'S', 't'), false);
    assert.equal(ms.calls.length, 0);
  });
});
