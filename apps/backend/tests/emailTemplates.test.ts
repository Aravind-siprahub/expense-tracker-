import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { inviteEmail, resetEmail, welcomeEmail } from '../src/emailTemplates';
import { EMAIL_LOGO_HEIGHT, EMAIL_LOGO_PNG_BASE64, EMAIL_LOGO_WIDTH, LOGO_CID } from '../src/emailLogo';

const reset = () => resetEmail({ name: 'Priya', code: 'ABCD-2345', link: 'https://app.example.test/reset?email=p%40example.test&code=ABCD2345' });
const all = () => [
  ['reset', reset()],
  ['welcome', welcomeEmail({ name: 'Priya', appUrl: 'https://app.example.test' })],
  ['invite', inviteEmail({ inviter: 'Aravind', family: 'Sharma Family', email: 'p@example.test', link: 'https://app.example.test/join?token=x', code: 'ABCD-2345' })],
] as const;

describe('branded email layout (every template)', () => {
  for (const [name, mail] of all()) {
    describe(name, () => {
      it('shows the attached logo at the top, 140 px wide, with its own aspect ratio, and no emoji or text heading', () => {
        assert.ok(mail.html.includes(`src="cid:${LOGO_CID}"`));
        assert.match(mail.html, /<img [^>]*width="140"/);
        assert.match(mail.html, /<img [^>]*style="[^"]*width:140px[^"]*height:auto/);
        const h = Math.round((EMAIL_LOGO_HEIGHT * 140) / EMAIL_LOGO_WIDTH);
        assert.ok(mail.html.includes(`height="${h}"`), 'height attribute keeps the ratio for Outlook');
        assert.ok(!mail.html.includes('&#128176;') && !/\u{1F4B0}/u.test(mail.html), 'the money-bag emoji is gone');
        assert.ok(mail.html.indexOf('<img') < mail.html.indexOf('<h1'), 'logo comes before the title');
      });

      it('uses the logo colours, a light-gray page and a white card', () => {
        for (const c of ['#0040a8', '#e02020', '#50a038', '#eef1f5', '#ffffff']) assert.ok(mail.html.includes(c), c);
      });

      it('has "Powered by SipraHub" and the copyright line in the footer', () => {
        assert.match(mail.html, /Powered by <span[^>]*>SipraHub<\/span>/);
        assert.match(mail.html, new RegExp(`&copy; ${new Date().getFullYear()} Expense Tracker`));
      });

      it('is email-safe: tables with inline styles, no flexbox/grid, no external CSS or scripts, responsive meta', () => {
        assert.match(mail.html, /<table role="presentation"/);
        assert.ok(!/display:\s*(flex|grid)/.test(mail.html));
        assert.ok(!/<link /i.test(mail.html) && !/<script/i.test(mail.html));
        assert.ok(mail.html.includes('name="viewport"'));
        assert.ok(mail.html.includes('@media only screen and (max-width:600px)'));
        assert.match(mail.html, /max-width:560px/);
        assert.ok(mail.html.includes('<!--[if mso]>'), 'Outlook fixes present');
      });

      it('does not use remote images (only the attached logo)', () => {
        const srcs = [...mail.html.matchAll(/<img [^>]*src="([^"]+)"/g)].map((m) => m[1]);
        assert.deepEqual(srcs, [`cid:${LOGO_CID}`]);
      });
    });
  }
});

describe('password reset email', () => {
  it('has a dark-blue "Reset Password" button that opens the reset link (with an Outlook version)', () => {
    const h = reset().html;
    assert.ok(h.includes('href="https://app.example.test/reset?email=p%40example.test&amp;code=ABCD2345"') || h.includes('href="https://app.example.test/reset?email=p%40example.test&code=ABCD2345"'));
    assert.match(h, /<a [^>]*background[^>]*>|<a [^>]*>Reset Password<\/a>/);
    assert.ok(h.includes('>Reset Password</a>'));
    assert.ok(h.includes('<v:roundrect') && h.includes('fillcolor="#0040a8"'));
    assert.match(h, /bgcolor="#0040a8"/);
  });

  it('shows the code in a light-gray box, bold with letter spacing', () => {
    const h = reset().html;
    const cell = h.match(/<td class="code"[^>]*>ABCD-2345<\/td>/)![0];
    assert.match(cell, /bgcolor="#f1f5f9"/);
    assert.match(cell, /font-weight:700/);
    assert.match(cell, /letter-spacing:5px/);
  });

  it('keeps the same subject, plain text, code and 30-minute wording as before (functionality unchanged)', () => {
    const m = reset();
    assert.equal(m.subject, 'Reset your Expense Tracker password');
    assert.equal(
      m.text,
      "Hi Priya,\n\nYour password reset code is: ABCD-2345\n\nEnter it in the app, or open this link on the web:\nhttps://app.example.test/reset?email=p%40example.test&code=ABCD2345\n\nThe code works once and expires in 30 minutes. If you didn't ask for this, ignore this email.",
    );
    assert.ok(m.html.includes('expires in 30 minutes'));
  });

  it('escapes anything that comes from a person (name, family, email)', () => {
    const m = resetEmail({ name: '<script>alert(1)</script>', code: 'ABCD-2345', link: 'https://x.test/?a=1&b="2"' });
    assert.ok(!m.html.includes('<script>alert(1)</script>'));
    assert.ok(m.html.includes('&lt;script&gt;'));
    const inv = inviteEmail({ inviter: '<b>x</b>', family: '"F"', email: 'a@b.test', link: 'https://x.test', code: 'ABCD-2345' });
    assert.ok(!inv.html.includes('<b>x</b>'));
  });
});

describe('family invitation email', () => {
  const invite = (over: Partial<Parameters<typeof inviteEmail>[0]> = {}) =>
    inviteEmail({ inviter: 'Aravind', family: 'Siddy', email: 'priya@example.test', link: 'https://app.example.test/join?token=SECRETTOKEN', code: 'ABCD-2345', ...over });

  it("is headed \"You're invited to join <family>!\" and names the inviter and the family", () => {
    const h = invite().html;
    assert.match(h, /<h1[^>]*>You&#39;re invited to join Siddy!<\/h1>/);
    assert.match(h, /<strong>Aravind<\/strong> has invited you to join <strong>Siddy<\/strong> on Expense Tracker/);
    assert.equal(invite({ family: 'Sharma Family' }).subject, 'Aravind invited you to Sharma Family on Expense Tracker');
  });

  it('says "Your invite code" (not "verification code") and shows the code in a light-gray box', () => {
    const h = invite().html;
    assert.match(h, />Your invite code</);
    assert.ok(!/verification code/i.test(h));
    const cell = h.match(/<td class="code"[^>]*>ABCD-2345<\/td>/)![0];
    assert.match(cell, /bgcolor="#f1f5f9"/);
    assert.match(cell, /font-weight:700/);
  });

  it('has no one-click text, no Join button, no join link and no divider', () => {
    const m = invite();
    assert.ok(!/Prefer one click/i.test(m.html) && !/Prefer one click/i.test(m.text));
    assert.ok(!/<a /i.test(m.html), 'no link or button at all');
    assert.ok(!m.html.includes('<v:roundrect'), 'no Outlook button either');
    assert.ok(!m.html.includes('Join Siddy</a>'));
    assert.ok(!m.html.includes('SECRETTOKEN') && !m.text.includes('SECRETTOKEN') && !m.text.includes('/join'), 'the join link is not in the email');
    assert.ok(!m.html.includes('height="1"'), 'no divider line');
  });

  it('gives the four steps, in order', () => {
    const h = invite().html;
    const order = [
      'Open the <strong>Expense Tracker</strong> app.',
      'Create an account or log in using the invited email address',
      'Select <strong>Join with an invite code</strong>.',
      'Enter the invite code to join <strong>Siddy</strong>.',
    ].map((s) => h.indexOf(s));
    assert.ok(order.every((i) => i > 0), 'all four present');
    assert.deepEqual(order, [...order].sort((a, b) => a - b));
    assert.ok(h.includes('priya@example.test'));
  });

  it('keeps the seven-day, single-use and invited-email rules in the wording', () => {
    const m = invite();
    for (const s of [m.html, m.text]) {
      assert.match(s, /valid for 7 days, can only be used once, and works only with priya@example.test/);
    }
  });

  it('plain-text version has the same content and the code', () => {
    const m = invite();
    assert.match(m.text, /^You're invited to join Siddy!/);
    assert.ok(m.text.includes('Your invite code: ABCD-2345'));
    assert.ok(m.text.includes('4. Enter the invite code to join Siddy.'));
  });

  it('escapes the inviter, family and email', () => {
    const m = invite({ inviter: '<i>x</i>', family: '<b>F</b>', email: 'a"b@example.test' });
    assert.ok(!m.html.includes('<i>x</i>') && !m.html.includes('<b>F</b>'));
    assert.ok(m.html.includes('&lt;b&gt;F&lt;/b&gt;'));
  });
});

describe('embedded logo', () => {
  it('is a real PNG of the expected size', () => {
    const png = Buffer.from(EMAIL_LOGO_PNG_BASE64, 'base64');
    assert.equal(png.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), EMAIL_LOGO_WIDTH);
    assert.equal(png.readUInt32BE(20), EMAIL_LOGO_HEIGHT);
    assert.ok(png.length < 60_000, 'small enough for email');
  });
});
