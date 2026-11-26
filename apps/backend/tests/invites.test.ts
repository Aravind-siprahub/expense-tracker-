import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApp, type Ctx, type TestUser } from './helpers';

let t: Ctx;
let admin: TestUser;
let member: TestUser; // an existing member of the family (not an admin)

before(async () => {
  t = await startApp();
  admin = await t.register('Invite Admin');
  member = await t.register('Invite Member');
  await t.createFamily(admin, 'Invite Family');
  await t.join(admin, member); // uses the verification code
});

after(async () => {
  await t.close();
});

const CODE_FORMAT = /^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;
const invite = (u: TestUser, email: string) => t.call('POST', '/family/invites', u.token, { email });
const accept = (u: TestUser, body: unknown) => t.call('POST', '/invites/accept', u.token, body);
const tokenOf = (joinLink: string) => new URL(joinLink).searchParams.get('token')!;
const membersOf = async () => (await t.call('GET', '/family', admin.token)).body.members.map((m: any) => m.userId);

describe('creating an invite', () => {
  it('returns a short verification code and a join link, but not the long token', async () => {
    const guest = await t.register('Guest One');
    const r = await invite(admin, guest.email);
    assert.equal(r.status, 201);
    assert.match(r.body.code, CODE_FORMAT);
    assert.equal(r.body.email, guest.email);
    assert.ok(r.body.joinLink.includes('/join?token='));
    assert.ok(!('token' in r.body), 'the long secret is only inside the link');
    assert.equal(typeof r.body.emailSent, 'boolean');
  });

  it('stores only a hash of the code, never the code itself', async () => {
    const guest = await t.register('Guest Hash');
    const r = await invite(admin, guest.email);
    const row = await t.prisma.invite.findUniqueOrThrow({ where: { id: r.body.id } });
    assert.ok(row.codeHash && row.codeHash.length === 64, 'sha-256 hex');
    const plain = r.body.code.replace('-', '');
    assert.ok(!JSON.stringify(row).includes(plain), 'plain code must not be stored');
    assert.equal(row.codeAttempts, 0);
  });

  it('only the family admin can invite', async () => {
    const guest = await t.register('Guest Nope');
    assert.equal((await invite(member, guest.email)).status, 403);
  });

  it('refuses someone who is already a member', async () => {
    assert.equal((await invite(admin, member.email)).status, 409);
  });

  it('refuses a bad email', async () => {
    assert.equal((await invite(admin, 'not-an-email')).status, 400);
  });

  it('a new invite replaces the earlier one for the same person', async () => {
    const guest = await t.register('Guest Twice');
    const first = await invite(admin, guest.email);
    const second = await invite(admin, guest.email);
    assert.notEqual(first.body.code, second.body.code);
    const pending = (await t.call('GET', '/family/invites', admin.token)).body.filter((i: any) => i.email === guest.email);
    assert.equal(pending.length, 1, 'only one open invite per person');
    // the old code no longer works, the new one does
    assert.equal((await accept(guest, { code: first.body.code })).status, 400);
    assert.equal((await accept(guest, { code: second.body.code })).status, 200);
  });
});

describe('joining with the verification code', () => {
  it('works with the invited email and puts the person in the family', async () => {
    const guest = await t.register('Guest Joins');
    const inv = await invite(admin, guest.email);
    const r = await accept(guest, { code: inv.body.code });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.role, 'MEMBER');
    assert.ok((await membersOf()).includes(guest.id));
  });

  it('ignores case, spaces and the dash', async () => {
    const guest = await t.register('Guest Typing');
    const inv = await invite(admin, guest.email);
    const typed = inv.body.code.toLowerCase().replace('-', '  ');
    assert.equal((await accept(guest, { code: typed })).status, 200);
  });

  it('works only once', async () => {
    const guest = await t.register('Guest Once');
    const other = await t.register('Someone Else');
    const inv = await invite(admin, guest.email);
    assert.equal((await accept(guest, { code: inv.body.code })).status, 200);
    assert.equal((await accept(other, { code: inv.body.code })).status, 400);
    assert.ok(!(await membersOf()).includes(other.id));
  });

  it('a wrong code is refused with one generic message', async () => {
    const guest = await t.register('Guest Wrong');
    await invite(admin, guest.email);
    const r = await accept(guest, { code: 'ZZZZ-ZZZZ' });
    assert.equal(r.status, 400);
    assert.match(r.body.message, /not valid/i);
    assert.ok(!(await membersOf()).includes(guest.id));
  });

  it('the code only works for the invited email address', async () => {
    const guest = await t.register('Guest Right Email');
    const intruder = await t.register('Intruder');
    const inv = await invite(admin, guest.email);
    const r = await accept(intruder, { code: inv.body.code });
    assert.equal(r.status, 400, 'someone with a different email cannot use it');
    assert.ok(!(await membersOf()).includes(intruder.id));
    // and the real invitee can still use it afterwards (the intruder did not burn it)
    assert.equal((await accept(guest, { code: inv.body.code })).status, 200);
  });

  it('locks the invite after 5 wrong codes, even for the right code', async () => {
    const guest = await t.register('Guest Locked');
    const inv = await invite(admin, guest.email);
    for (let i = 0; i < 5; i++) assert.equal((await accept(guest, { code: 'AAAA-BBBB' })).status, 400);
    const row = await t.prisma.invite.findUniqueOrThrow({ where: { id: inv.body.id } });
    assert.equal(row.codeAttempts, 5);
    assert.equal((await accept(guest, { code: inv.body.code })).status, 400, 'locked');
    // a fresh invite starts clean
    const again = await invite(admin, guest.email);
    assert.equal((await accept(guest, { code: again.body.code })).status, 200);
  });

  it('an expired invite cannot be used', async () => {
    const guest = await t.register('Guest Expired');
    const inv = await invite(admin, guest.email);
    await t.prisma.invite.update({ where: { id: inv.body.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
    assert.equal((await accept(guest, { code: inv.body.code })).status, 400);
  });

  it('a revoked invite cannot be used', async () => {
    const guest = await t.register('Guest Revoked');
    const inv = await invite(admin, guest.email);
    assert.equal((await t.call('DELETE', `/family/invites/${inv.body.id}`, admin.token)).status, 204);
    assert.equal((await accept(guest, { code: inv.body.code })).status, 400);
  });

  it('someone who is already in a family cannot join another', async () => {
    const other = await t.register('Other Admin');
    await t.createFamily(other, 'Other Family');
    const inv = await invite(admin, other.email);
    assert.equal((await accept(other, { code: inv.body.code })).status, 409);
  });

  it('needs a login', async () => {
    assert.equal((await t.call('POST', '/invites/accept', null, { code: 'ABCD-2345' })).status, 401);
  });
});

describe('the one-click link still works', () => {
  it('joins with the token from the link', async () => {
    const guest = await t.register('Guest Link');
    const inv = await invite(admin, guest.email);
    const r = await accept(guest, { token: tokenOf(inv.body.joinLink) });
    assert.equal(r.status, 200);
    assert.ok((await membersOf()).includes(guest.id));
  });

  it('the link only works for the invited email too', async () => {
    const guest = await t.register('Guest Link 2');
    const intruder = await t.register('Intruder 2');
    const inv = await invite(admin, guest.email);
    assert.equal((await accept(intruder, { token: tokenOf(inv.body.joinLink) })).status, 403);
  });
});

describe('request validation', () => {
  it('needs exactly one of code or token', async () => {
    const guest = await t.register('Guest Validate');
    assert.equal((await accept(guest, {})).status, 400);
    assert.equal((await accept(guest, { code: 'ABCD-2345', token: 'x'.repeat(20) })).status, 400);
    assert.equal((await accept(guest, { code: '123' })).status, 400, 'too short');
    assert.equal((await accept(guest, { code: 'ABCD-2345', extra: 1 })).status, 400, 'unknown fields refused');
  });
});

describe('the invite email', () => {
  it('shows the invite code (no one-click join link), and escapes names', async () => {
    const { inviteEmail } = await import('../src/emailTemplates');
    const mail = inviteEmail({
      inviter: 'Rajesh <script>',
      family: 'Sharma & Sons',
      email: 'priya@example.com',
      link: 'http://localhost:3000/join?token=abc&email=priya%40example.com',
      code: 'ABCD-2345',
    });
    for (const body of [mail.html, mail.text]) {
      assert.ok(body.includes('ABCD-2345'), 'code is shown');
      assert.ok(!body.includes('/join?token='), 'the join link is not in the email');
    }
    assert.ok(!/<script>/.test(mail.html), 'html is escaped');
    assert.match(mail.html, /Sharma &amp; Sons/);
    assert.match(mail.text, /Create an account or log in using the invited email address \(priya@example.com\)/);
  });
});
