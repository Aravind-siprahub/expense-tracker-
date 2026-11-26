// HTML + plain-text emails. Built with tables and inline styles because that is what
// Gmail, Outlook and phone mail apps render reliably. Every email also has a plain-text
// version for clients that don't show HTML.
//
// All emails share one branded layout (see `layout`): the Expense Tracker logo (attached to the message, shown at 140 px),
// the logo's blue / red / green, a light-gray page with a white card, and "Powered by SipraHub" in the footer.

import { EMAIL_LOGO_HEIGHT, EMAIL_LOGO_WIDTH, LOGO_CID } from './emailLogo';

const BRAND = 'Expense Tracker';
// Colours taken from the logo.
const BLUE = '#0040a8';
const RED = '#e02020';
const GREEN = '#50a038';
const PAGE = '#eef1f5'; // light gray behind the card
const INK = '#0f172a';
const TEXT = '#334155';
const MUTED = '#64748b';
const LINE = '#dbe3ee';
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "Consolas,'Courier New',monospace";

const LOGO_SHOWN_WIDTH = 140;
const LOGO_SHOWN_HEIGHT = Math.round((EMAIL_LOGO_HEIGHT * LOGO_SHOWN_WIDTH) / EMAIL_LOGO_WIDTH);

export interface Email {
  subject: string;
  html: string;
  text: string;
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const para = (html: string) =>
  `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${TEXT};">${html}</p>`;

/** A dark-blue button. Outlook (which cannot style links as buttons) gets an equivalent drawn shape (VML). */
const button = (label: string, href: string) => `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
    <tr><td align="center" bgcolor="${BLUE}" style="background:${BLUE};border-radius:8px;">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${esc(href)}" style="height:48px;v-text-anchor:middle;width:280px;" arcsize="17%" stroke="f" fillcolor="${BLUE}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">${esc(label)}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-->
      <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:14px 36px;font-family:${FONT};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${esc(label)}</a>
      <!--<![endif]-->
    </td></tr>
  </table>`;

/** The verification code in a light-gray box: bold, spaced letters. */
const codeBox = (code: string, big = false) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;">
    <tr><td class="code" align="${big ? 'center' : 'left'}" bgcolor="#f1f5f9" style="background:#f1f5f9;border:1px solid ${LINE};border-radius:8px;padding:${big ? '18px 12px' : '12px 14px'};font-family:${MONO};font-size:${big ? '28px' : '13px'};line-height:${big ? '34px' : '20px'};font-weight:${big ? '700' : '400'};letter-spacing:${big ? '5px' : '0'};color:${INK};word-break:break-all;">${esc(code)}</td></tr>
  </table>`;

const steps = (items: string[]) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 8px;">${items
    .map(
      (t, i) => `
    <tr>
      <td valign="top" width="34" style="width:34px;padding:0 0 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td width="24" height="24" align="center" bgcolor="#dbe7fb" style="width:24px;height:24px;border-radius:12px;background:#dbe7fb;color:${BLUE};font-family:${FONT};font-size:12px;line-height:24px;font-weight:700;">${i + 1}</td></tr></table>
      </td>
      <td valign="top" style="padding:1px 0 12px;font-family:${FONT};font-size:15px;line-height:22px;color:${TEXT};">${t}</td>
    </tr>`,
    )
    .join('')}</table>`;

const small = (html: string) => `<p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};">${html}</p>`;

function layout(opts: { preheader: string; title: string; body: string; footer: string }) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <title>${esc(opts.title)}</title>
  <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
  <style>
    @media only screen and (max-width:600px) {
      .px { padding-left:20px !important; padding-right:20px !important; }
      .h1 { font-size:21px !important; line-height:28px !important; }
      .code { font-size:24px !important; letter-spacing:3px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:${PAGE};font-family:${FONT};-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAGE};font-size:1px;line-height:1px;">${esc(opts.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${PAGE}" style="background:${PAGE};">
    <tr><td align="center" style="padding:28px 12px;">
      <!--[if mso]><table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
        <tr><td style="font-size:0;line-height:0;border-radius:14px 14px 0 0;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
            <td height="5" width="60%" bgcolor="${BLUE}" style="height:5px;line-height:5px;font-size:1px;background:${BLUE};">&nbsp;</td>
            <td height="5" width="20%" bgcolor="${RED}" style="height:5px;line-height:5px;font-size:1px;background:${RED};">&nbsp;</td>
            <td height="5" width="20%" bgcolor="${GREEN}" style="height:5px;line-height:5px;font-size:1px;background:${GREEN};">&nbsp;</td>
          </tr></table>
        </td></tr>
        <tr><td class="px" bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${LINE};border-top:0;border-radius:0 0 14px 14px;padding:32px 32px 28px;font-family:${FONT};">
          <img src="cid:${LOGO_CID}" alt="${BRAND}" width="${LOGO_SHOWN_WIDTH}" height="${LOGO_SHOWN_HEIGHT}" style="display:block;margin:0 auto 24px;width:${LOGO_SHOWN_WIDTH}px;max-width:${LOGO_SHOWN_WIDTH}px;height:auto;border:0;border-radius:16px;outline:none;text-decoration:none;">
          <h1 class="h1" style="margin:0 0 18px;font-family:${FONT};font-size:22px;line-height:30px;color:${BLUE};text-align:center;">${esc(opts.title)}</h1>
          ${opts.body}
        </td></tr>
        <tr><td align="center" style="padding:18px 8px 0;font-family:${FONT};font-size:12px;line-height:18px;color:${MUTED};text-align:center;">
          ${opts.footer}<br><br>This is an automated message from a no-reply address. Please don't reply to this email.
          <br><br><span style="color:${INK};font-weight:700;">Powered by <span style="color:${BLUE};">SipraHub</span></span>
          <br>&copy; ${year} ${BRAND}. All rights reserved.
        </td></tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
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
// Joined by typing the code in the app: there is deliberately no one-click button. (`link` is still accepted, for callers
// that pass it, but it is not shown.)

export function inviteEmail(o: {
  inviter: string;
  family: string;
  email: string;
  link?: string;
  code: string;
}): Email {
  const subject = `${o.inviter} invited you to ${o.family} on ${BRAND}`;
  const html = layout({
    preheader: `Your invite code to join "${o.family}" is ${o.code}.`,
    title: `You're invited to join ${o.family}!`,
    body:
      para(
        `<strong>${esc(o.inviter)}</strong> has invited you to join <strong>${esc(o.family)}</strong> on ${BRAND} to manage your family's income, expenses and budgets together.`,
      ) +
      `<p style="margin:8px 0 0;font-size:12px;line-height:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${MUTED};text-align:center;">Your invite code</p>` +
      codeBox(o.code, true) +
      `<p style="margin:0 0 12px;font-size:16px;line-height:24px;font-weight:700;color:${INK};">How to join your family</p>` +
      steps([
        `Open the <strong>${BRAND}</strong> app.`,
        `Create an account or log in using the invited email address (<strong>${esc(o.email)}</strong>).`,
        'Select <strong>Join with an invite code</strong>.',
        `Enter the invite code to join <strong>${esc(o.family)}</strong>.`,
      ]) +
      small(`This invite code is valid for 7 days, can only be used once, and works only with ${esc(o.email)}.`),
    footer: `Sent to ${esc(o.email)} because ${esc(o.inviter)} invited you.<br>If you were not expecting this invitation, you can safely ignore this email.`,
  });
  const text = [
    `You're invited to join ${o.family}!`,
    '',
    `${o.inviter} has invited you to join ${o.family} on ${BRAND} to manage your family's income, expenses and budgets together.`,
    '',
    `Your invite code: ${o.code}`,
    '',
    'How to join your family:',
    `1. Open the ${BRAND} app.`,
    `2. Create an account or log in using the invited email address (${o.email}).`,
    '3. Select "Join with an invite code".',
    `4. Enter the invite code to join ${o.family}.`,
    '',
    `This invite code is valid for 7 days, can only be used once, and works only with ${o.email}. If you were not expecting this invitation, you can safely ignore this email.`,
  ].join('\n');
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
      button('Reset Password', o.link) +
      `<p style="margin:0;font-size:13px;line-height:20px;color:${MUTED};text-align:center;">This code works once and expires in 30 minutes.</p>`,
    footer: `Didn't ask to reset your password? You can ignore this email. Your password won't change.`,
  });
  const text =
    `Hi ${o.name},\n\nYour password reset code is: ${o.code}\n\n` +
    `Enter it in the app, or open this link on the web:\n${o.link}\n\n` +
    `The code works once and expires in 30 minutes. If you didn't ask for this, ignore this email.`;
  return { subject, html, text };
}
