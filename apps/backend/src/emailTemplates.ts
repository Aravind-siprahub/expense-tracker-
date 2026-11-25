// HTML + plain-text emails. Built with tables and inline styles because that is what
// Gmail, Outlook and phone mail apps render reliably. Every email also has a plain-text
// version for clients that don't show HTML.

const BRAND = 'Expense Tracker';
const BLUE = '#2563eb';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const para = (html: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#374151;">${html}</p>`;

const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr><td style="background:${BLUE};border-radius:8px;">
      <a href="${esc(href)}" style="display:inline-block;padding:14px 32px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;

const codeBox = (code: string, big = false) => `
  <div style="margin:8px 0 20px;padding:${big ? '18px' : '12px 14px'};background:#f3f4f6;border:1px dashed #cbd5e1;border-radius:8px;text-align:${big ? 'center' : 'left'};font-family:Consolas,'Courier New',monospace;font-size:${big ? '28px' : '13px'};font-weight:${big ? '700' : '400'};letter-spacing:${big ? '4px' : '0'};color:#111827;word-break:break-all;">${esc(code)}</div>`;

const steps = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 8px;width:100%;">${items
    .map(
      (t, i) => `
    <tr>
      <td valign="top" style="width:30px;padding:0 0 12px;">
        <div style="width:22px;height:22px;line-height:22px;border-radius:11px;background:#dbeafe;color:#1d4ed8;text-align:center;font-size:12px;font-weight:700;">${i + 1}</div>
      </td>
      <td valign="top" style="padding:1px 0 12px;font-size:15px;line-height:22px;color:#374151;">${t}</td>
    </tr>`,
    )
    .join('')}</table>`;

const divider = `<div style="height:1px;background:#e5e7eb;margin:24px 0;"></div>`;

function layout(opts: { preheader: string; title: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${esc(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:${FONT};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f3f4f6;">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;">
        <tr><td style="padding:0 6px 14px;font-family:${FONT};font-size:18px;font-weight:700;color:#1d4ed8;">&#128176; ${BRAND}</td></tr>
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:32px 28px;font-family:${FONT};">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:30px;color:#111827;">${esc(opts.title)}</h1>
          ${opts.body}
        </td></tr>
        <tr><td style="padding:16px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:#6b7280;text-align:center;">${opts.footer}<br><br>This is an automated message from a no-reply address. Please don't reply to this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ── Welcome ─────────────────────────────────────────────────────────────────

export function welcomeEmail(o: { name: string; appUrl: string }): Email {
  const subject = `Welcome to ${BRAND}`;
  const html = layout({
    preheader: 'Your account is ready. Here is how to get started.',
    title: `Welcome, ${o.name}!`,
    body:
      para('Your account is ready. Here is how to get started:') +
      steps([
        '<strong>Create your family group</strong> (or join one with an invite code).',
        '<strong>Add your income</strong> and set a monthly budget.',
        '<strong>Add expenses</strong> from the web or your phone, in under 30 seconds.',
      ]) +
      button('Open Expense Tracker', o.appUrl),
    footer: `You received this because an account was created with this email address.<br>If that wasn't you, you can ignore this message.`,
  });
  const text =
    `Welcome, ${o.name}!\n\nYour account is ready. To get started:\n` +
    `1. Create your family group (or join one with an invite code).\n` +
    `2. Add your income and set a monthly budget.\n` +
    `3. Add expenses from the web or your phone.\n\n` +
    `Open the app: ${o.appUrl}\n\n` +
    `If you didn't create this account, ignore this email.`;
  return { subject, html, text };
}

// ── Family invite ───────────────────────────────────────────────────────────

export function inviteEmail(o: {
  inviter: string;
  family: string;
  email: string;
  link: string;
  code: string;
}): Email {
  const subject = `${o.inviter} invited you to ${o.family} on ${BRAND}`;
  const html = layout({
    preheader: `Your verification code to join "${o.family}" is ${o.code}.`,
    title: `Join ${o.family}`,
    body:
      para(`<strong>${esc(o.inviter)}</strong> invited you to track your family's income, expenses and budget together on ${BRAND}.`) +
      para('Your verification code:') +
      codeBox(o.code, true) +
      steps([
        `Create an account or log in with <strong>${esc(o.email)}</strong>.`,
        'Choose <strong>Join with an invite code</strong> and enter the code above.',
        `You'll be added to <strong>${esc(o.family)}</strong>.`,
      ]) +
      divider +
      `<p style="margin:0 0 4px;font-size:13px;line-height:20px;color:#6b7280;">Prefer one click? This button fills in the code for you:</p>` +
      button(`Join ${o.family}`, o.link) +
      `<p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">The code works only with ${esc(o.email)}, only once, and expires in 7 days.</p>`,
    footer: `Sent to ${esc(o.email)} because ${esc(o.inviter)} invited you.<br>If you don't know them, you can ignore this email.`,
  });
  const text =
    `${o.inviter} invited you to join "${o.family}" on ${BRAND}.\n\n` +
    `Your verification code: ${o.code}\n\n` +
    `1. Create an account or log in with ${o.email}\n` +
    `2. Choose "Join with an invite code" and enter the code above\n\n` +
    `Or join with one click:\n${o.link}\n\n` +
    `The code works only with ${o.email}, only once, and expires in 7 days. If you don't know ${o.inviter}, ignore this email.`;
  return { subject, html, text };
}

// ── Password reset ──────────────────────────────────────────────────────────

export function resetEmail(o: { name: string; code: string; link: string }): Email {
  const subject = `Reset your ${BRAND} password`;
  const html = layout({
    preheader: `Your password reset code is ${o.code}. It expires in 30 minutes.`,
    title: 'Reset your password',
    body:
      para(`Hi ${esc(o.name)}, use this code to choose a new password:`) +
      codeBox(o.code, true) +
      para('Or tap the button and the code will be filled in for you.') +
      button('Choose a new password', o.link) +
      `<p style="margin:0;font-size:13px;line-height:20px;color:#6b7280;">The code works once and expires in 30 minutes.</p>`,
    footer: `Didn't ask to reset your password? You can ignore this email. Your password won't change.`,
  });
  const text =
    `Hi ${o.name},\n\nYour password reset code is: ${o.code}\n\n` +
    `Enter it in the app, or open this link on the web:\n${o.link}\n\n` +
    `The code works once and expires in 30 minutes. If you didn't ask for this, ignore this email.`;
  return { subject, html, text };
}
